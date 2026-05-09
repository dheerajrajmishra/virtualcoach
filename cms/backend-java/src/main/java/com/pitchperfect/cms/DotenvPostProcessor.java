package com.pitchperfect.cms;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvEntry;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.io.ClassPathResource;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * Loads .env into Spring's Environment before any @Value injection occurs.
 * Registered in META-INF/spring/org.springframework.boot.env.EnvironmentPostProcessor.
 *
 * Search order for .env (stops at first one found):
 *   1. Directory containing the compiled classes (project root when running from IDE)
 *   2. JVM working directory (user.dir)
 *   3. Two levels up from user.dir
 */
public class DotenvPostProcessor implements EnvironmentPostProcessor {

    private static final String SOURCE_NAME = "dotenvFile";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Dotenv dotenv = tryLoad(resolveProjectRoot(), "classes root")
                .or(() -> tryLoad(System.getProperty("user.dir"), "user.dir"))
                .or(() -> tryLoad(System.getProperty("user.dir") + "/../../", "user.dir/../.."))
                .orElse(null);

        if (dotenv == null) {
            System.out.println("[DotenvPostProcessor] No .env file found — skipping");
            return;
        }

        Map<String, Object> props = new HashMap<>();
        for (DotenvEntry e : dotenv.entries()) {
            props.put(e.getKey(), e.getValue());
        }

        // Lowest priority: only fills gaps not already set by OS env / system properties
        environment.getPropertySources().addLast(new MapPropertySource(SOURCE_NAME, props));

        String rawKey = dotenv.get("AZURE_OPENAI_KEY", null);
        String masked = rawKey != null && rawKey.length() > 8
                ? rawKey.substring(0, 4) + "..." + rawKey.substring(rawKey.length() - 4) + " (len=" + rawKey.length() + ")"
                : "(not found)";
        System.out.println("[DotenvPostProcessor] Loaded " + props.size() + " entries. AZURE_OPENAI_KEY=" + masked);
    }

    private java.util.Optional<Dotenv> tryLoad(String dir, String label) {
        if (dir == null) return java.util.Optional.empty();
        try {
            File f = new File(dir, ".env");
            System.out.println("[DotenvPostProcessor] Trying " + label + ": " + f.getAbsolutePath()
                    + (f.exists() ? " ✓" : " ✗"));
            Dotenv d = Dotenv.configure().directory(dir).ignoreIfMissing().load();
            // dotenv-java returns an empty instance if file is missing — check for any entry
            if (d.entries().isEmpty()) return java.util.Optional.empty();
            return java.util.Optional.of(d);
        } catch (Exception e) {
            System.out.println("[DotenvPostProcessor] Error loading from " + label + ": " + e.getMessage());
            return java.util.Optional.empty();
        }
    }

    /** Resolves the directory that contains compiled classes (i.e. the Maven project root). */
    private String resolveProjectRoot() {
        try {
            // ClassPathResource("") resolves to target/classes/ — go up two levels to reach project root
            File classesDir = new ClassPathResource("").getFile();
            return classesDir.getParentFile().getParentFile().getAbsolutePath();
        } catch (Exception e) {
            return null;
        }
    }
}

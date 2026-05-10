"use client";
import { useTrainingStore } from '../store/useTrainingStore'
import LanguageSelector from './LanguageSelector'

const CATEGORIES = ['Product Training', 'Sales Process', 'Compliance', 'Onboarding', 'Skills']
const PRODUCTS = ['Product A', 'Product B', 'Product C', 'Product D']

export default function MetadataForm() {
  const { draft, setDraftField } = useTrainingStore()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Training Metadata</h2>

      <div>
        <label className="label">Training Name *</label>
        <input
          className="input"
          type="text"
          value={draft.name}
          onChange={(e) => setDraftField('name', e.target.value)}
          placeholder="e.g., Q3 Product Launch Training"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category *</label>
          <select
            className="input"
            value={draft.category}
            onChange={(e) => setDraftField('category', e.target.value)}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Product *</label>
          <select
            className="input"
            value={draft.product}
            onChange={(e) => setDraftField('product', e.target.value)}
          >
            <option value="">Select product</option>
            {PRODUCTS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <LanguageSelector />
    </div>
  )
}


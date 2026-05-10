"use client";
import { useTrainingStore } from '../store/useTrainingStore'
import LanguageSelector from './LanguageSelector'

const CATEGORIES = ['Product Training', 'Sales Process', 'Compliance', 'Onboarding', 'Skills']
const PRODUCTS = ['Product A', 'Product B', 'Product C', 'Product D']

export default function MetadataForm() {
  const { draft, setDraftField } = useTrainingStore()

  return (
    <div className="space-y-5">
      <div>
        <label className="label">Training Name <span className="text-red-500">*</span></label>
        <input
          className="input"
          type="text"
          value={draft.name}
          onChange={(e) => setDraftField('name', e.target.value)}
          placeholder="e.g., Q3 Product Launch Training"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="label">Category <span className="text-red-500">*</span></label>
          <select
            className="input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_12px_center]"
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
          <label className="label">Product <span className="text-red-500">*</span></label>
          <select
            className="input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_12px_center]"
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

      <div className="pt-2">
        <LanguageSelector />
      </div>
    </div>
  )
}

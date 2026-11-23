import { useState } from 'react'
import type { FormEvent } from 'react'
import type { SavedEntry, SavedFood } from './lib/nutritionStorage'
import './ManualFood.css'

type Props = {
  date: string
  disabled: boolean
  onSave: (food: SavedFood, entry: SavedEntry, remember: boolean) => void
  onCancel: () => void
}

const parseAmount = (value: string): number =>
  value.trim() === '' ? NaN : Number(value)

export default function ManualFood({ date, disabled, onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<'g' | 'ml'>('g')
  const [servingSize, setServingSize] = useState('100')
  const [servings, setServings] = useState('1')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [remember, setRemember] = useState(true)

  const size = parseAmount(servingSize)
  const count = parseAmount(servings)
  const values = [calories, protein, carbs, fat].map(parseAmount)
  const valid = name.trim().length > 0 &&
    name.trim().length <= 150 &&
    Number.isFinite(size) && size > 0 && size <= 100000 &&
    Number.isFinite(count) && count > 0 && count <= 1000 &&
    size * count <= 100000 &&
    values.every(value => Number.isFinite(value) && value >= 0 && value <= 100000)

  const total = valid ? {
    calories: values[0] * count,
    protein: values[1] * count,
    carbs: values[2] * count,
    fat: values[3] * count,
  } : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || !total || disabled) return

    const food: SavedFood = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: 'Custom food',
      calories: values[0] * 100 / size,
      protein: values[1] * 100 / size,
      carbs: values[2] * 100 / size,
      fat: values[3] * 100 / size,
    }

    const entry: SavedEntry = {
      id: crypto.randomUUID(),
      name: food.name,
      food,
      date,
      grams: size * count,
      unit,
      ...total,
    }

    onSave(food, entry, remember)
  }

  return (
    <form className="manual-food" onSubmit={submit}>
      <p className="form-description">
        Enter nutrition exactly as it appears on the label, per serving.
        Fractions such as 0.5 or 1.25 servings are supported.
      </p>
      <label>
        Food name
        <input required maxLength={150} value={name}
          onChange={event => setName(event.target.value)}
          placeholder="e.g. Homemade chicken curry" />
      </label>
      <div className="manual-food-row">
        <label>
          Serving size
          <input required type="number" min="0.01" step="any"
            inputMode="decimal" value={servingSize}
            onChange={event => setServingSize(event.target.value)} />
        </label>
        <label>
          Unit
          <select value={unit} onChange={event => setUnit(event.target.value as 'g' | 'ml')}>
            <option value="g">grams (g)</option>
            <option value="ml">milliliters (ml)</option>
          </select>
        </label>
      </div>
      <p className="form-description">Nutrition for ONE serving of {servingSize || '…'} {unit}</p>
      <div className="manual-food-grid">
        {([
          ['Calories', calories, setCalories],
          ['Protein (g)', protein, setProtein],
          ['Carbs (g)', carbs, setCarbs],
          ['Fat (g)', fat, setFat],
        ] as const).map(([label, value, setter]) => (
          <label key={label}>
            {label}
            <input required type="number" min="0" step="any"
              inputMode="decimal" value={value}
              onChange={event => setter(event.target.value)}
              placeholder="0" />
          </label>
        ))}
      </div>
      <label>
        Number of servings
        <input required type="number" min="0.01" max="1000" step="any"
          inputMode="decimal" value={servings}
          onChange={event => setServings(event.target.value)} />
      </label>
      {total && (
        <div className="nutrition-preview" aria-live="polite">
          <strong>Diary preview</strong>
          <p>{Math.round(size * count * 100) / 100} {unit} · {Math.round(total.calories)} kcal</p>
          <p>P {total.protein.toFixed(1)} g · C {total.carbs.toFixed(1)} g · F {total.fat.toFixed(1)} g</p>
        </div>
      )}
      <label className="manual-food-checkbox">
        <input type="checkbox" checked={remember}
          onChange={event => setRemember(event.target.checked)} />
        Save this custom food to Favorites for next time
      </label>
      <div className="manual-food-actions">
        <button type="button" className="settings-button" onClick={onCancel} disabled={disabled}>Cancel</button>
        <button type="submit" className="save-food-button" disabled={!valid || disabled}>
          {disabled ? 'Saving…' : 'Add to Food Diary'}
        </button>
      </div>
    </form>
  )
}


import { useState } from 'react'
import './SmartGoals.css'

export type NutritionGoals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

type MacroKey = 'protein' | 'carbs' | 'fat'

type Props = {
  current: NutritionGoals
  onSave: (goals: NutritionGoals) => void
  onCancel: () => void
}

const macroDetails: Record<
  MacroKey,
  { name: string; kcal: number; color: string }
> = {
  protein: {
    name: 'Protein',
    kcal: 4,
    color: '#4285f4',
  },
  carbs: {
    name: 'Carbohydrates',
    kcal: 4,
    color: '#e6a23c',
  },
  fat: {
    name: 'Fat',
    kcal: 9,
    color: '#a855f7',
  },
}

const macroKeys: MacroKey[] = [
  'protein',
  'carbs',
  'fat',
]

function validNumber(value: string): number | null {
  if (value.trim() === '') return null

  const number = Number(value)

  if (!Number.isFinite(number) || number < 0) {
    return null
  }

  return number
}

function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function format(value: number): string {
  return round(value).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })
}

export default function SmartGoals({
  current,
  onSave,
  onCancel,
}: Props) {
  const [calorieInput, setCalorieInput] = useState(
    String(current.calories)
  )

  const [firstMacro, setFirstMacro] =
    useState<MacroKey>('protein')

  const [secondMacro, setSecondMacro] =
    useState<MacroKey>('carbs')

  const [amounts, setAmounts] = useState<
    Record<MacroKey, string>
  >({
    protein: String(current.protein),
    carbs: String(current.carbs),
    fat: String(current.fat),
  })

  const lastMacro = macroKeys.find(
    key =>
      key !== firstMacro &&
      key !== secondMacro
  ) as MacroKey

  const calorieGoal = validNumber(calorieInput)
  const firstAmount = validNumber(amounts[firstMacro])
  const secondAmount = validNumber(amounts[secondMacro])

  const firstCalories =
    firstAmount === null
      ? null
      : firstAmount * macroDetails[firstMacro].kcal

  const secondCalories =
    secondAmount === null
      ? null
      : secondAmount * macroDetails[secondMacro].kcal

  const remainingAfterFirst =
    calorieGoal !== null &&
    firstCalories !== null
      ? calorieGoal - firstCalories
      : null

  const remainingAfterSecond =
    remainingAfterFirst !== null &&
    secondCalories !== null
      ? remainingAfterFirst - secondCalories
      : null

  const firstValid =
    calorieGoal !== null &&
    calorieGoal > 0 &&
    firstCalories !== null &&
    firstCalories <= calorieGoal + 0.000001

  const secondValid =
    firstValid &&
    secondCalories !== null &&
    remainingAfterSecond !== null &&
    remainingAfterSecond >= -0.000001

  const valid = secondValid

  const finalAmount =
    valid && remainingAfterSecond !== null
      ? Math.max(0, remainingAfterSecond) /
        macroDetails[lastMacro].kcal
      : null

  const firstMax =
    calorieGoal !== null
      ? calorieGoal / macroDetails[firstMacro].kcal
      : 0

  const secondMax =
    firstValid && remainingAfterFirst !== null
      ? Math.max(0, remainingAfterFirst) /
        macroDetails[secondMacro].kcal
      : 0

  function percentage(calories: number | null) {
    if (
      calorieGoal === null ||
      calorieGoal <= 0 ||
      calories === null
    ) {
      return 0
    }

    return Math.max(
      0,
      Math.min(100, calories / calorieGoal * 100)
    )
  }

  function updateAmount(key: MacroKey, value: string) {
    setAmounts(previous => ({
      ...previous,
      [key]: value,
    }))
  }

  function chooseFirst(key: MacroKey) {
    setFirstMacro(key)

    if (key === secondMacro) {
      const replacement = macroKeys.find(
        macro => macro !== key
      ) as MacroKey

      setSecondMacro(replacement)
    }
  }

  function saveGoals() {
    if (
      !valid ||
      calorieGoal === null ||
      firstAmount === null ||
      secondAmount === null ||
      finalAmount === null
    ) {
      return
    }

    const updated: NutritionGoals = {
      calories: calorieGoal,
      protein: 0,
      carbs: 0,
      fat: 0,
    }

    updated[firstMacro] = firstAmount
    updated[secondMacro] = secondAmount
    updated[lastMacro] = finalAmount

    onSave(updated)
  }

  function resetSuggestedSplit() {
    const calories = calorieGoal ?? current.calories

    setFirstMacro('protein')
    setSecondMacro('carbs')

    // Example starting allocation:
    // 30% protein, 40% carbs, 30% fat.
    setAmounts({
      protein: String(round(calories * 0.30 / 4)),
      carbs: String(round(calories * 0.40 / 4)),
      fat: String(round(calories * 0.30 / 9)),
    })
  }

  const firstPercent = percentage(firstCalories)
  const secondPercent = percentage(secondCalories)

  const lastPercent =
    valid && remainingAfterSecond !== null
      ? percentage(Math.max(0, remainingAfterSecond))
      : 0

  return (
    <section className="card smart-goals">
      <div className="smart-goals-heading">
        <div>
          <h2>Smart Macro Goals</h2>
          <p>
            Allocate your daily calories to three macros.
          </p>
        </div>

        <button
          type="button"
          className="smart-reset"
          onClick={resetSuggestedSplit}
        >
          Suggested Split
        </button>
      </div>

      <div className="smart-calorie-box">
        <label htmlFor="smart-calories">
          Daily Calorie Goal
        </label>

        <div className="smart-number-input">
          <input
            id="smart-calories"
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            value={calorieInput}
            onChange={event =>
              setCalorieInput(event.target.value)
            }
          />

          <span>kcal</span>
        </div>
      </div>

      <div className="smart-step">
        <div className="smart-step-title">
          <span className="smart-step-number">1</span>
          <h3>Choose your first macro</h3>
        </div>

        <div className="smart-macro-options">
          {macroKeys.map(key => (
            <button
              type="button"
              key={key}
              className={
                firstMacro === key ? 'selected' : ''
              }
              onClick={() => chooseFirst(key)}
            >
              {macroDetails[key].name}
            </button>
          ))}
        </div>

        <div className="smart-entry-row">
          <div>
            <label htmlFor="first-macro-grams">
              {macroDetails[firstMacro].name} (grams)
            </label>

            <input
              id="first-macro-grams"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amounts[firstMacro]}
              onChange={event =>
                updateAmount(
                  firstMacro,
                  event.target.value
                )
              }
            />
          </div>

          <div className="smart-allocation">
            <strong>
              {firstAmount !== null
                ? `${format(firstPercent)}%`
                : '—'}
            </strong>

            <small>of total calories</small>
          </div>
        </div>

        <p className="smart-helper">
          Maximum available: {format(firstMax)} g
        </p>

        <div className="smart-progress">
          <div
            style={{
              width: `${firstPercent}%`,
              backgroundColor:
                macroDetails[firstMacro].color,
            }}
          />
        </div>

        {calorieGoal !== null &&
          calorieGoal > 0 &&
          firstCalories !== null &&
          firstCalories > calorieGoal && (
            <p className="smart-error" role="alert">
              This macro requires {format(firstCalories)}
              {' '}calories, exceeding your{' '}
              {format(calorieGoal)} calorie goal.
            </p>
          )}

        <p className="smart-remaining">
          {firstValid && remainingAfterFirst !== null
            ? format(Math.max(0, remainingAfterFirst))
            : '—'}
          {' '}calories remaining
        </p>
      </div>

      <div className="smart-step">
        <div className="smart-step-title">
          <span className="smart-step-number">2</span>
          <h3>Choose your second macro</h3>
        </div>

        <div className="smart-macro-options">
          {macroKeys
            .filter(key => key !== firstMacro)
            .map(key => (
              <button
                type="button"
                key={key}
                className={
                  secondMacro === key ? 'selected' : ''
                }
                onClick={() => setSecondMacro(key)}
              >
                {macroDetails[key].name}
              </button>
            ))}
        </div>

        <div className="smart-entry-row">
          <div>
            <label htmlFor="second-macro-grams">
              {macroDetails[secondMacro].name} (grams)
            </label>

            <input
              id="second-macro-grams"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amounts[secondMacro]}
              onChange={event =>
                updateAmount(
                  secondMacro,
                  event.target.value
                )
              }
            />
          </div>

          <div className="smart-allocation">
            <strong>
              {secondAmount !== null
                ? `${format(secondPercent)}%`
                : '—'}
            </strong>

            <small>of total calories</small>
          </div>
        </div>

        <p className="smart-helper">
          Maximum available:{' '}
          {firstValid
            ? `${format(secondMax)} g`
            : 'Set a valid first macro'}
        </p>

        <div className="smart-progress">
          <div
            style={{
              width: `${secondPercent}%`,
              backgroundColor:
                macroDetails[secondMacro].color,
            }}
          />
        </div>

        {firstValid &&
          secondCalories !== null &&
          remainingAfterFirst !== null &&
          secondCalories > remainingAfterFirst && (
            <p className="smart-error" role="alert">
              Only {format(remainingAfterFirst)}
              {' '}calories remain. Reduce this macro
              to {format(secondMax)} g or less.
            </p>
          )}
      </div>

      <div className="smart-step">
        <div className="smart-step-title">
          <span className="smart-step-number">3</span>
          <h3>
            {macroDetails[lastMacro].name}
            {' '}is calculated automatically
          </h3>
        </div>

        <div className="smart-result">
          <div>
            <small>Remaining macro</small>
            <strong>
              {finalAmount !== null
                ? `${format(finalAmount)} g`
                : '—'}
            </strong>
          </div>

          <div className="smart-result-percent">
            <strong>
              {valid
                ? `${format(lastPercent)}%`
                : '—'}
            </strong>
            <small>of daily calories</small>
          </div>
        </div>
      </div>

      <div className="smart-summary">
        <h3>Daily Macro Allocation</h3>

        <div className="smart-summary-bar">
          {valid && (
            <>
              <div
                style={{
                  width: `${firstPercent}%`,
                  backgroundColor:
                    macroDetails[firstMacro].color,
                }}
              />
              <div
                style={{
                  width: `${secondPercent}%`,
                  backgroundColor:
                    macroDetails[secondMacro].color,
                }}
              />
              <div
                style={{
                  width: `${lastPercent}%`,
                  backgroundColor:
                    macroDetails[lastMacro].color,
                }}
              />
            </>
          )}
        </div>

        <div className="smart-summary-details">
          <span>
            {valid
              ? '100% allocated'
              : 'Complete valid macro targets'}
          </span>

          <strong>
            {calorieGoal !== null
              ? `${format(calorieGoal)} kcal`
              : '—'}
          </strong>
        </div>

        {valid ? (
          <p className="smart-success">
            ✓ Your macro targets add up to your
            calorie goal.
          </p>
        ) : (
          <p className="smart-error" role="alert">
            Enter a positive calorie goal and
            valid macro amounts within your budget
            before saving.
          </p>
        )}
      </div>

      <p className="smart-formula">
        Protein: 4 kcal/g · Carbs: 4 kcal/g ·
        Fat: 9 kcal/g
      </p>

      <div className="smart-actions">
        <button
          type="button"
          className="smart-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type="button"
          className="smart-save"
          disabled={!valid}
          onClick={saveGoals}
        >
          Save Goals
        </button>
      </div>
    </section>
  )
}

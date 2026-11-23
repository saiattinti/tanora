
import { useCallback, useEffect, useRef, useState } from 'react'
import { searchIngredients } from './usda'
import type { USDAFood } from './usda'
import SmartGoals from './SmartGoals'
import BarcodeScanner from './BarcodeScanner'
import ManualFood from './ManualFood'
import type {
  BarcodeProduct,
  BarcodeNutrition,
} from './BarcodeScanner'
import {
  loadNutritionData,
  saveCloudGoals,
  saveCloudEntry,
  deleteCloudEntry,
  saveCloudFavorite,
  deleteCloudFavorite,
} from './lib/nutritionStorage'
import type {
  NutritionGoals,
  SavedEntry,
} from './lib/nutritionStorage'
import { readGuestData, saveGuestData } from './lib/guestStorage'
import './App.css'

type Food = USDAFood
type Entry = SavedEntry
type Macros = NutritionGoals

type Props = {
  userId: string | null
  userEmail: string
  onSignOut: () => Promise<void>
}

type Portion = {
  label: string
  grams: number
}

const defaults: Macros = {
  calories: 2200,
  protein: 160,
  carbs: 230,
  fat: 70,
}

const starterFoods: Food[] = [
  { id: '1', name: 'Chicken breast, cooked', source: 'Starter estimate', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: '2', name: 'Chicken breast, raw', source: 'Starter estimate', calories: 120, protein: 22.5, carbs: 0, fat: 2.6 },
  { id: '3', name: 'Chicken thigh, cooked', source: 'Starter estimate', calories: 209, protein: 26, carbs: 0, fat: 10.9 },
  { id: '4', name: 'White rice, cooked', source: 'Starter estimate', calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
  { id: '5', name: 'Basmati rice, dry', source: 'Starter estimate', calories: 365, protein: 8, carbs: 79, fat: 0.7 },
  { id: '6', name: 'Whole egg', source: 'Starter estimate', calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  { id: '7', name: 'Egg white', source: 'Starter estimate', calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2 },
  { id: '8', name: 'Potato, baked', source: 'Starter estimate', calories: 93, protein: 2.5, carbs: 21.2, fat: 0.1 },
  { id: '9', name: 'Banana', source: 'Starter estimate', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { id: '10', name: 'Apple', source: 'Starter estimate', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  { id: '11', name: 'Broccoli, cooked', source: 'Starter estimate', calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4 },
  { id: '12', name: 'Salmon, cooked', source: 'Starter estimate', calories: 206, protein: 22.1, carbs: 0, fat: 12.4 },
]

const nutrientColors = {
  protein: '#4285f4',
  carbs: '#e6a23c',
  fat: '#a855f7',
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function macrosFor(food: Food, grams: number): Macros {
  const factor = grams / 100
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  }
}

function possiblePortions(food: Food): Portion[] {
  const name = food.name.toLowerCase()

  if (/tomato/.test(name) &&
      !/powder|paste|sauce|juice|canned|dried/.test(name)) {
    return [{ label: '1 medium tomato (~123 g)', grams: 123 }]
  }

  if (/carrot/.test(name) &&
      !/juice|dehydrat|dry|canned|cake/.test(name)) {
    return [{ label: '1 medium carrot (~61 g)', grams: 61 }]
  }

  if (/apple/.test(name) &&
      !/juice|dried|pie|sauce/.test(name)) {
    return [{ label: '1 medium apple (~182 g)', grams: 182 }]
  }

  if (/banana/.test(name) &&
      !/chips|bread|dried/.test(name)) {
    return [{ label: '1 medium banana (~118 g)', grams: 118 }]
  }

  if (/egg/.test(name) &&
      /whole|raw/.test(name) &&
      !/dried|powder/.test(name)) {
    return [{ label: '1 large egg (~50 g)', grams: 50 }]
  }

  if (/milk/.test(name) &&
      /fluid|whole|nonfat|reduced fat/.test(name) &&
      !/dried|powder|shake|sheep/.test(name)) {
    return [{ label: '1 cup milk (~244 g)', grams: 244 }]
  }

  if (/rice/.test(name) &&
      /cooked/.test(name) &&
      !/cake|pudding|flour/.test(name)) {
    return [{ label: '1 cup cooked rice (~158 g)', grams: 158 }]
  }

  return []
}

function uniqueFoods(foods: Food[]): Food[] {
  return [...new Map(foods.map(food => [food.id, food])).values()]
}

function readLocalArray(key: string): unknown[] {
  try {
    const saved = localStorage.getItem(key)
    const parsed: unknown = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isFood(value: unknown): value is Food {
  if (typeof value !== 'object' || value === null) return false

  const food = value as Record<string, unknown>

  return (
    typeof food.id === 'string' &&
    typeof food.name === 'string' &&
    typeof food.source === 'string' &&
    ['calories', 'protein', 'carbs', 'fat'].every(
      key =>
        typeof food[key] === 'number' &&
        Number.isFinite(food[key]) &&
        (food[key] as number) >= 0
    )
  )
}

function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) return false

  const entry = value as Record<string, unknown>

  return (
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    typeof entry.grams === 'number' &&
    Number.isFinite(entry.grams) &&
    entry.grams > 0 &&
    ['calories', 'protein', 'carbs', 'fat'].every(
      key =>
        typeof entry[key] === 'number' &&
        Number.isFinite(entry[key]) &&
        (entry[key] as number) >= 0
    ) &&
    (
      entry.food === undefined ||
      entry.food === null ||
      isFood(entry.food)
    )
  )
}

function isGoals(value: unknown): value is Macros {
  if (typeof value !== 'object' || value === null) return false

  const goals = value as Record<string, unknown>

  return (
    ['calories', 'protein', 'carbs', 'fat'].every(
      key =>
        typeof goals[key] === 'number' &&
        Number.isFinite(goals[key]) &&
        (goals[key] as number) >= 0
    ) &&
    (goals.calories as number) > 0
  )
}

function App({ userId, userEmail, onSignOut }: Props) {
  const guest = userId === null
  const [goals, setGoals] = useState<Macros>(defaults)
  const [hasCloudGoals, setHasCloudGoals] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [favorites, setFavorites] = useState<Food[]>([])

  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [cloudError, setCloudError] = useState('')
  const [cloudMessage, setCloudMessage] = useState('')

  const [selectedDate, setSelectedDate] = useState(
    () => dateKey(new Date())
  )

  const [editingGoals, setEditingGoals] = useState(false)
  const [addingFood, setAddingFood] = useState(false)
  const [addMode, setAddMode] = useState<
    'ingredients' | 'barcode' | 'manual'
  >('ingredients')

  const [searchMode, setSearchMode] = useState<
    'ingredients' | 'starter'
  >('ingredients')

  const [query, setQuery] = useState('')
  const [recommended, setRecommended] = useState<Food[]>([])
  const [more, setMore] = useState<Food[]>([])
  const [showMore, setShowMore] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [grams, setGrams] = useState('100')
  const [quantity, setQuantity] = useState('1')
  const [portionMode, setPortionMode] = useState('grams')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingUnit, setEditingUnit] = useState<'g' | 'ml'>('g')

  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState('')
  const requestId = useRef(0)

  const importMarker = `nutrition-imported-${userId}`

  const localEntries = readLocalArray('nutrition-entries')
    .filter(isEntry)

  const localFavorites = readLocalArray('nutrition-favorites')
    .filter(isFood)

  let localGoals: Macros | null = null

  try {
    const raw = localStorage.getItem('nutrition-goals')
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (isGoals(parsed)) localGoals = parsed
  } catch {
    // Leave older local data untouched if parsing fails.
  }

  const hasOldData =
    localEntries.length > 0 ||
    localFavorites.length > 0 ||
    localGoals !== null

  const importedAlready =
    localStorage.getItem(importMarker) === 'true'

  const refresh = useCallback(async () => {
    const data = guest ? readGuestData() : await loadNutritionData(userId!)
    setGoals(data.goals ?? defaults)
    setHasCloudGoals(data.goals !== null)
    setEntries(data.entries)
    setFavorites(data.favorites)
  }, [userId, guest])

  useEffect(() => {
    let active = true

    void (guest ? Promise.resolve(readGuestData()) : loadNutritionData(userId!))
      .then(data => {
        if (!active) return

        setGoals(data.goals ?? defaults)
        setHasCloudGoals(data.goals !== null)
        setEntries(data.entries)
        setFavorites(data.favorites)
        setReady(true)
      })
      .catch(error => {
        if (!active) return
        setCloudError(
          error instanceof Error
            ? error.message
            : 'Could not load your cloud nutrition data.'
        )
      })

    return () => {
      active = false
    }
  }, [userId, guest])

  async function performCloudAction(
    action: () => Promise<void>,
    message = ''
  ) {
    if (busyRef.current) return false

    busyRef.current = true
    setBusy(true)
    setCloudError('')
    setCloudMessage('')

    try {
      await action()
      if (message) setCloudMessage(message)
      return true
    } catch (error) {
      setCloudError(
        error instanceof Error
          ? error.message
          : 'Could not save to your account.'
      )
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function reload() {
    await performCloudAction(
      async () => {
        await refresh()
        setReady(true)
      },
      guest ? 'Your guest data is up to date.' : 'Your cloud data is up to date.'
    )
  }

  async function importOldData() {
    if (guest || importedAlready || !hasOldData) return

    const confirmed = window.confirm(
      `Import browser data into ${userEmail}?\n\n` +
      `${localEntries.length} diary entries\n` +
      `${localFavorites.length} favorite foods\n` +
      `${localGoals ? 'Saved macro goals' : 'No saved macro goals'}\n\n` +
      'Only continue if this browser data belongs to you. ' +
      'Existing cloud goals will not be overwritten.'
    )

    if (!confirmed) return

    await performCloudAction(async () => {
      const cloud = await loadNutritionData(userId!)
      const existingIds = new Set(cloud.entries.map(e => e.id))
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      for (const entry of localEntries) {
        if (uuidPattern.test(entry.id) && existingIds.has(entry.id)) {
          continue
        }

        const normalized: Entry = {
          ...entry,
          id: uuidPattern.test(entry.id)
            ? entry.id
            : crypto.randomUUID(),
          unit: entry.unit ?? 'g',
        }

        await saveCloudEntry(userId!, normalized)
      }

      const cloudFavorites = new Set(
        cloud.favorites.map(food => food.id)
      )

      for (const food of localFavorites) {
        if (!cloudFavorites.has(food.id)) {
          await saveCloudFavorite(userId!, food)
        }
      }

      if (localGoals && !cloud.goals) {
        await saveCloudGoals(userId!, localGoals)
      }

      await refresh()
      localStorage.setItem(importMarker, 'true')
    }, 'Your old browser data was imported. The originals remain untouched.')
  }

  const dailyEntries = entries.filter(
    entry => entry.date === selectedDate
  )

  const consumed = dailyEntries.reduce<Macros>(
    (sum, entry) => ({
      calories: sum.calories + entry.calories,
      protein: sum.protein + entry.protein,
      carbs: sum.carbs + entry.carbs,
      fat: sum.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const recentFoods = uniqueFoods(
    entries
      .slice()
      .reverse()
      .map(entry => entry.food)
      .filter((food): food is Food => Boolean(food))
  )

  const matches = (food: Food) =>
    !query.trim() ||
    food.name.toLowerCase().includes(query.trim().toLowerCase())

  const starred = favorites.filter(matches)

  const recent = recentFoods
    .filter(
      food =>
        matches(food) &&
        !starred.some(favorite => favorite.id === food.id)
    )
    .slice(0, 5)

  const starterMatches = starterFoods.filter(matches)

  const portions =
    selectedFood && editingUnit === 'g'
      ? possiblePortions(selectedFood)
      : []

  const chosenPortion = portions.find(
    portion => portion.label === portionMode
  )

  const amount = chosenPortion
    ? Number(quantity) * chosenPortion.grams
    : Number(grams)

  const validAmount =
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= 100000 &&
    (chosenPortion
      ? quantity.trim() !== ''
      : grams.trim() !== '')

  const preview =
    selectedFood && validAmount
      ? macrosFor(selectedFood, amount)
      : null

  function clearSearch() {
    requestId.current++
    setRecommended([])
    setMore([])
    setLoading(false)
    setSearched(false)
    setSearchError('')
    setShowMore(false)
  }

  function closeFood() {
    clearSearch()
    setAddingFood(false)
    setEditingId(null)
    setEditingUnit('g')
    setAddMode('ingredients')
    setSelectedFood(null)
    setQuery('')
    setGrams('100')
    setPortionMode('grams')
    setQuantity('1')
  }

  async function performSearch() {
    if (!query.trim()) return

    const current = ++requestId.current
    setLoading(true)
    setSearchError('')
    setSearched(false)
    setRecommended([])
    setMore([])
    setSelectedFood(null)
    setShowMore(false)

    try {
      const result = await searchIngredients(query)
      if (current !== requestId.current) return

      setRecommended(result.recommended)
      setMore(result.more)
      setSearched(true)
    } catch (error) {
      if (current !== requestId.current) return

      setSearchError(
        error instanceof Error ? error.message : 'Search failed'
      )
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }

  function selectFood(food: Food) {
    setSelectedFood(food)
    setEditingUnit('g')
    setGrams('100')
    setQuantity('1')
    setPortionMode('grams')
  }

  async function saveGoals(updated: Macros) {
    const success = await performCloudAction(async () => {
      if (guest) {
        saveGuestData({ goals: updated, entries, favorites })
      } else {
        await saveCloudGoals(userId!, updated)
      }
      setGoals(updated)
      setHasCloudGoals(true)
    }, 'Your nutrition goals were saved.')

    if (success) setEditingGoals(false)
  }

  async function saveEntry(entry: Entry) {
    const success = await performCloudAction(async () => {
      if (guest) {
        const next = entries.some(item => item.id === entry.id)
          ? entries.map(item => item.id === entry.id ? entry : item)
          : [...entries, entry]
        saveGuestData({ goals, entries: next, favorites })
      } else {
        await saveCloudEntry(userId!, entry)
      }
      setEntries(previous =>
        previous.some(item => item.id === entry.id)
          ? previous.map(item =>
              item.id === entry.id ? entry : item
            )
          : [...previous, entry]
      )
    }, guest ? 'Food saved on this device.' : 'Food saved to your account.')

    if (success) closeFood()
  }

  async function saveManualFood(food: Food, entry: Entry, remember: boolean) {
    const success = await performCloudAction(async () => {
      if (guest) {
        saveGuestData({
          goals,
          entries: [...entries, entry],
          favorites: remember ? uniqueFoods([...favorites, food]) : favorites,
        })
      } else {
        await saveCloudEntry(userId!, entry)
        if (remember) await saveCloudFavorite(userId!, food)
      }
      setEntries(previous => [...previous, entry])
      if (remember) setFavorites(previous => uniqueFoods([...previous, food]))
    }, guest ? 'Custom food saved on this device.' : 'Custom food saved to your account.')

    if (success) closeFood()
  }

  async function repeatEntry(entry: Entry) {
    await saveEntry({
      ...entry,
      id: crypto.randomUUID(),
      date: selectedDate,
    })
  }

  async function addFood() {
    if (!selectedFood || !preview || busy) return

    const entry: Entry = {
      id: editingId ?? crypto.randomUUID(),
      name: selectedFood.name,
      grams: amount,
      date: selectedDate,
      food: selectedFood,
      unit: editingUnit,
      ...preview,
    }

    await saveEntry(entry)
  }

  async function addBarcodeFood(
    product: BarcodeProduct,
    portionAmount: number,
    nutrition: BarcodeNutrition
  ) {
    if (busy) return

    const food: Food = {
      id: `off-${product.barcode}`,
      name: product.brand
        ? `${product.brand} ${product.name}`
        : product.name,
      source: 'Open Food Facts',
      calories: product.calories,
      protein: product.protein,
      carbs: product.carbs,
      fat: product.fat,
    }

    await saveEntry({
      id: crypto.randomUUID(),
      name: food.name,
      date: selectedDate,
      grams: portionAmount,
      unit: product.servingUnit,
      food,
      ...nutrition,
    })
  }

  function editFood(entry: Entry) {
    let food = entry.food ??
      starterFoods.find(item => item.name === entry.name)

    if (!food && entry.grams > 0) {
      const factor = 100 / entry.grams

      food = {
        id: `legacy-${entry.id}`,
        name: entry.name,
        source: 'Older diary entry',
        calories: entry.calories * factor,
        protein: entry.protein * factor,
        carbs: entry.carbs * factor,
        fat: entry.fat * factor,
      }
    }

    if (!food) return

    clearSearch()
    setAddMode('ingredients')
    setQuery(food.name)
    setSelectedFood(food)
    setRecommended([food])
    setSearched(true)
    setGrams(String(entry.grams))
    setPortionMode('grams')
    setEditingUnit(entry.unit ?? 'g')
    setEditingId(entry.id)
    setSearchMode('ingredients')
    setAddingFood(true)
  }

  async function removeEntry(entryId: string) {
    await performCloudAction(async () => {
      if (guest) {
        saveGuestData({ goals, entries: entries.filter(item => item.id !== entryId), favorites })
      } else {
        await deleteCloudEntry(userId!, entryId)
      }
      setEntries(previous =>
        previous.filter(item => item.id !== entryId)
      )

      if (editingId === entryId) closeFood()
    }, 'Food removed from your diary.')
  }

  async function toggleFavorite(food: Food) {
    const exists = favorites.some(f => f.id === food.id)

    await performCloudAction(async () => {
      if (exists) {
        if (guest) {
          saveGuestData({ goals, entries, favorites: favorites.filter(f => f.id !== food.id) })
        } else {
          await deleteCloudFavorite(userId!, food.id)
        }
        setFavorites(previous =>
          previous.filter(f => f.id !== food.id)
        )
      } else {
        if (guest) {
          saveGuestData({ goals, entries, favorites: uniqueFoods([...favorites, food]) })
        } else {
          await saveCloudFavorite(userId!, food)
        }
        setFavorites(previous => uniqueFoods([...previous, food]))
      }
    })
  }

  function changeDate(days: number) {
    const [year, month, day] = selectedDate.split('-').map(Number)

    setSelectedDate(
      dateKey(new Date(year, month - 1, day + days))
    )

    closeFood()
  }

  function renderFood(food: Food) {
    const isFavorite = favorites.some(f => f.id === food.id)

    return (
      <div className="ingredient-result" key={food.id}>
        <button
          type="button"
          className={`ingredient-pick ${
            selectedFood?.id === food.id ? 'chosen' : ''
          }`}
          onClick={() => selectFood(food)}
        >
          <span>
            <strong>{food.name}</strong>
            <small>{food.source}</small>
          </span>

          <span className="ingredient-kcal">
            {Math.round(food.calories)} kcal / 100 units
          </span>
        </button>

        <button
          type="button"
          className="favorite-button"
          disabled={busy}
          aria-label={
            isFavorite
              ? `Unfavorite ${food.name}`
              : `Favorite ${food.name}`
          }
          onClick={() => void toggleFavorite(food)}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
    )
  }

  const displayDate = new Date(
    `${selectedDate}T12:00:00`
  ).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (!ready) {
    return (
      <main className="app">
        <h1>Nutrition Tracker</h1>
        <p>
          {cloudError ||
            (guest ? 'Loading guest nutrition data...' : 'Loading your private nutrition data from Supabase...')}
        </p>
        {cloudError && (
          <button onClick={() => void reload()}>
            Retry
          </button>
        )}
      </main>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">
            YOUR PERSONAL NUTRITION TRACKER
          </p>
          <h1>Nutrition Dashboard</h1>
          <p className="subtitle">
            Track your daily calories and macros.
          </p>
          <p className="subtitle">
            {guest ? 'Guest Mode · Saved on this device only' : `Signed in: ${userEmail}`}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <button
            className="settings-button"
            disabled={busy}
            onClick={() => void reload()}
          >
            {guest ? 'Reload' : 'Refresh'}
          </button>

          <button
            className="settings-button"
            disabled={busy}
            onClick={() => setEditingGoals(previous => !previous)}
          >
            {editingGoals ? 'Close Goals' : 'Edit Goals'}
          </button>

          <button
            className="settings-button"
            disabled={busy}
            onClick={() => void onSignOut()}
          >
            {guest ? 'Sign In / Create Account' : 'Sign Out'}
          </button>
        </div>
      </header>

      <div
        role="status"
        aria-live="polite"
        style={{ marginBottom: 12 }}
      >
        {busy && <p>{guest ? 'Saving on this device...' : 'Saving to your account...'}</p>}
        {cloudMessage && (
          <p style={{ color: '#087f5b' }}>{cloudMessage}</p>
        )}
        {cloudError && (
          <p role="alert" style={{ color: '#b63126' }}>
            {guest ? 'Storage error' : 'Cloud error'}: {cloudError}
          </p>
        )}
      </div>

      {!guest && hasOldData && !importedAlready && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h2>Import Old Nutrition Data</h2>
          <p className="form-description">
            This browser has older food logs, favorites, or
            goals saved before cloud accounts were added.
            Import them only if they belong to your account.
          </p>
          <p className="form-description">
            Found {localEntries.length} diary entries and{' '}
            {localFavorites.length} favorite foods.
          </p>
          <button
            type="button"
            className="add-button"
            disabled={busy}
            onClick={() => void importOldData()}
          >
            Import My Old Data
          </button>
        </section>
      )}

      {editingGoals && (
        <SmartGoals
          current={goals}
          onSave={updated => void saveGoals(updated)}
          onCancel={() => setEditingGoals(false)}
        />
      )}

      {!hasCloudGoals && (
        <p className="form-description">
          {guest ? 'Guest mode is using starter calorie goals.' : 'Your account is using starter calorie goals.'}
          Select Edit Goals to save your own targets.
        </p>
      )}

      <div className="date-navigation">
        <button
          onClick={() => changeDate(-1)}
          aria-label="Previous day"
        >
          ←
        </button>

        <strong>{displayDate}</strong>

        <button
          onClick={() => changeDate(1)}
          aria-label="Next day"
        >
          →
        </button>
      </div>

      <section className="calorie-card">
        <p className="card-label">Calories consumed</p>

        <div className="calorie-number">
          {Math.round(consumed.calories).toLocaleString()}
          <span>
            {' '}/ {Math.round(goals.calories).toLocaleString()} kcal
          </span>
        </div>

        <p className="remaining">
          {Math.round(
            goals.calories - consumed.calories
          ).toLocaleString()}
          {' '}calories remaining
        </p>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${
                Math.min(
                  100,
                  goals.calories > 0
                    ? consumed.calories / goals.calories * 100
                    : 0
                )
              }%`,
            }}
          />
        </div>
      </section>

      <h2 className="section-title">Daily Macros</h2>

      <section className="macro-grid">
        {(['protein', 'carbs', 'fat'] as const).map(key => {
          const value = consumed[key]
          const target = goals[key]

          return (
            <div className="card macro-card" key={key}>
              <div className="macro-heading">
                <span>
                  {key === 'carbs'
                    ? 'Carbs'
                    : key === 'fat'
                      ? 'Fat'
                      : 'Protein'}
                </span>
                <span
                  className="macro-dot"
                  style={{
                    backgroundColor: nutrientColors[key],
                  }}
                />
              </div>

              <div className="macro-value">
                {value.toFixed(1)} g
              </div>

              <p className="macro-target">
                Goal: {target.toFixed(1)} g
              </p>

              <div className="progress-track small">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      Math.min(
                        100,
                        target > 0 ? value / target * 100 : 0
                      )
                    }%`,
                    backgroundColor: nutrientColors[key],
                  }}
                />
              </div>
            </div>
          )
        })}
      </section>

      <section className="card food-section">
        <div>
          <h2>Food Diary</h2>
          <p>{dailyEntries.length} food entries</p>
        </div>

        <button
          className="add-button"
          disabled={busy}
          onClick={() =>
            addingFood ? closeFood() : setAddingFood(true)
          }
        >
          {addingFood ? 'Cancel' : '+ Add Food'}
        </button>
      </section>

      {addingFood && (
        <section className="card food-form">
          <h2>{editingId ? 'Edit Food' : 'Add Food'}</h2>

          {!editingId && (
            <div className="search-mode-switch">
              <button
                type="button"
                className={
                  addMode === 'ingredients' ? 'active' : ''
                }
                onClick={() => {
                  setAddMode('ingredients')
                  clearSearch()
                }}
              >
                Ingredient Search
              </button>

              <button
                type="button"
                className={
                  addMode === 'barcode' ? 'active' : ''
                }
                onClick={() => {
                  clearSearch()
                  setAddMode('barcode')
                }}
              >
                📷 Scan Barcode
              </button>
              <button
                type="button"
                className={addMode === 'manual' ? 'active' : ''}
                onClick={() => {
                  clearSearch()
                  setAddMode('manual')
                }}
              >
                ✏️ Manual Food
              </button>
            </div>
          )}

          {addMode === 'manual' && !editingId ? (
            <ManualFood
              date={selectedDate}
              disabled={busy}
              onSave={(food, entry, remember) => void saveManualFood(food, entry, remember)}
              onCancel={closeFood}
            />
          ) : addMode === 'barcode' && !editingId ? (
            <BarcodeScanner
              onAdd={(
                product,
                portionAmount,
                nutrition
              ) => {
                void addBarcodeFood(
                  product,
                  portionAmount,
                  nutrition
                )
              }}
              onCancel={() => setAddMode('ingredients')}
            />
          ) : (
            <>
              <p className="form-description">
                Search ingredients and log the amount eaten.
              </p>

              {!editingId && (
                <div className="search-mode-switch">
                  <button
                    type="button"
                    className={
                      searchMode === 'ingredients' ? 'active' : ''
                    }
                    onClick={() => {
                      clearSearch()
                      setQuery('')
                      setSelectedFood(null)
                      setSearchMode('ingredients')
                    }}
                  >
                    USDA Ingredients
                  </button>

                  <button
                    type="button"
                    className={
                      searchMode === 'starter' ? 'active' : ''
                    }
                    onClick={() => {
                      clearSearch()
                      setQuery('')
                      setSelectedFood(null)
                      setSearchMode('starter')
                    }}
                  >
                    Starter Foods
                  </button>
                </div>
              )}

              <form
                className="food-search-form"
                onSubmit={event => {
                  event.preventDefault()
                  if (searchMode === 'ingredients') {
                    void performSearch()
                  }
                }}
              >
                <input
                  className="food-search"
                  type="search"
                  placeholder="Tomato, carrot, chicken..."
                  value={query}
                  onChange={event => {
                    setQuery(event.target.value)
                    clearSearch()
                    setSelectedFood(null)
                  }}
                />

                {searchMode === 'ingredients' && (
                  <button
                    className="search-button"
                    type="submit"
                    disabled={loading || busy || !query.trim()}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                )}
              </form>

              {searchError && (
                <p className="search-error">{searchError}</p>
              )}

              {starred.length > 0 && (
                <div className="ingredient-group">
                  <h3>★ Favorites</h3>
                  {starred.map(renderFood)}
                </div>
              )}

              {recent.length > 0 && (
                <div className="ingredient-group">
                  <h3>Recently Logged</h3>
                  {recent.map(renderFood)}
                </div>
              )}

              {searchMode === 'starter' && (
                <div className="ingredient-group">
                  <h3>Starter Foods</h3>
                  {starterMatches.map(renderFood)}
                </div>
              )}

              {searchMode === 'ingredients' &&
                recommended.length > 0 && (
                  <div className="ingredient-group">
                    <h3>Recommended Ingredient Matches</h3>
                    {recommended.map(renderFood)}
                  </div>
                )}

              {searchMode === 'ingredients' &&
                more.length > 0 && (
                  <div className="ingredient-group">
                    <button
                      className="more-results-button"
                      onClick={() => setShowMore(!showMore)}
                    >
                      {showMore ? 'Hide' : 'Show'}{' '}
                      {more.length} additional USDA results
                    </button>

                    {showMore && (
                      <div className="all-ingredient-results">
                        {more.map(renderFood)}
                      </div>
                    )}
                  </div>
                )}

              {searchMode === 'ingredients' &&
                searched &&
                !loading &&
                !searchError &&
                recommended.length === 0 &&
                more.length === 0 && (
                  <p className="form-description">
                    No complete USDA records found.
                    Try a different search.
                  </p>
                )}

              {selectedFood && (
                <div className="portion-editor">
                  <h3>{selectedFood.name}</h3>

                  <p className="form-description">
                    Source: {selectedFood.source}.
                    Nutrition is calculated per 100 {editingUnit}.
                  </p>

                  {portions.length > 0 && (
                    <>
                      <label htmlFor="portion-mode">
                        Measure food by
                      </label>

                      <select
                        className="portion-select"
                        id="portion-mode"
                        value={portionMode}
                        onChange={event =>
                          setPortionMode(event.target.value)
                        }
                      >
                        <option value="grams">Grams</option>
                        {portions.map(portion => (
                          <option
                            value={portion.label}
                            key={portion.label}
                          >
                            {portion.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {chosenPortion ? (
                    <>
                      <label htmlFor="quantity">
                        How many?
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        min="0.1"
                        max="1000"
                        step="any"
                        value={quantity}
                        onChange={event =>
                          setQuantity(event.target.value)
                        }
                      />

                      <p className="form-description">
                        Estimated total: {Math.round(amount)} g
                      </p>
                    </>
                  ) : (
                    <>
                      <label htmlFor="grams">
                        Amount ({editingUnit})
                      </label>
                      <input
                        id="grams"
                        type="number"
                        min="0.1"
                        max="100000"
                        step="any"
                        value={grams}
                        onChange={event =>
                          setGrams(event.target.value)
                        }
                      />
                    </>
                  )}

                  {preview && (
                    <div className="nutrition-preview">
                      <h3>Calculated Nutrition</h3>

                      <div className="preview-grid">
                        <div>
                          <strong>
                            {Math.round(preview.calories)}
                          </strong>
                          <span>Calories</span>
                        </div>

                        <div>
                          <strong>
                            {preview.protein.toFixed(1)} g
                          </strong>
                          <span>Protein</span>
                        </div>

                        <div>
                          <strong>
                            {preview.carbs.toFixed(1)} g
                          </strong>
                          <span>Carbs</span>
                        </div>

                        <div>
                          <strong>
                            {preview.fat.toFixed(1)} g
                          </strong>
                          <span>Fat</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    className="save-food-button"
                    disabled={!preview || busy}
                    onClick={() => void addFood()}
                  >
                    {busy
                      ? 'Saving...'
                      : editingId
                        ? 'Save Changes'
                        : 'Add to Food Diary'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {dailyEntries.length > 0 && (
        <section className="card diary-list">
          <h2>Logged Foods</h2>

          {dailyEntries.map(entry => (
            <div className="diary-entry" key={entry.id}>
              <div className="diary-info">
                <strong>{entry.name}</strong>
                <p>
                  {Math.round(entry.grams * 10) / 10}
                  {' '}{entry.unit ?? 'g'} ·{' '}
                  {Math.round(entry.calories)} kcal
                </p>
                <small>
                  P: {entry.protein.toFixed(1)} g ·{' '}
                  C: {entry.carbs.toFixed(1)} g ·{' '}
                  F: {entry.fat.toFixed(1)} g
                </small>
              </div>

              <div className="diary-actions">
                <button
                  disabled={busy}
                  onClick={() => editFood(entry)}
                >
                  Edit
                </button>

                <button
                  disabled={busy}
                  onClick={() => void repeatEntry(entry)}
                  title="Add another copy of this food today"
                >
                  Repeat
                </button>

                <button
                  className="delete-button"
                  disabled={busy}
                  onClick={() => void removeEntry(entry.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <p className="footer-note">
        Nutrition Tracker · {guest ? 'Guest Mode (local only)' : 'Account Cloud Sync'}
      </p>
    </div>
  )
}

export default App

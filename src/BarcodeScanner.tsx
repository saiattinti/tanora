
import { useEffect, useRef, useState } from 'react'
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'
import './BarcodeScanner.css'

export type BarcodeProduct = {
  barcode: string
  name: string
  brand: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  servingSize: number | null
  servingUnit: 'g' | 'ml'
  servingDescription: string
}

export type BarcodeNutrition = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

type Props = {
  onAdd: (
    product: BarcodeProduct,
    amount: number,
    nutrition: BarcodeNutrition,
    perHundred: BarcodeNutrition
  ) => void
  onCancel: () => void
  onManual: () => void
}

const scannerId = 'tanora-barcode-camera'

function format(number: number): string {
  return Number(number.toFixed(2)).toLocaleString()
}

export default function BarcodeScanner({
  onAdd,
  onCancel,
  onManual,
}: Props) {
  const scanner = useRef<Html5Qrcode | null>(null)
  const busy = useRef(false)
  const mounted = useRef(true)

  const [cameraActive, setCameraActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [product, setProduct] = useState<BarcodeProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'amount' | 'servings'>('servings')
  const [amountInput, setAmountInput] = useState('100')
  const [servingsInput, setServingsInput] = useState('1')
  const [corrected, setCorrected] = useState({
    calories: '', protein: '', carbs: '', fat: '',
  })

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
      busy.current = true
      const active = scanner.current
      scanner.current = null

      if (active) {
        try {
          if (active.isScanning) {
            void active.stop().catch(() => {})
          }
        } catch {
          // Camera may already be closed.
        }
      }
    }
  }, [])

  async function stopCamera() {
    const active = scanner.current
    scanner.current = null
    setCameraActive(false)

    if (active) {
      try {
        if (active.isScanning) {
          await active.stop()
        }
      } catch {
        // The camera might already be stopping.
      }
    }
  }

  async function lookup(rawCode: string) {
    const code = rawCode.trim()

    if (!/^\d{8,14}$/.test(code)) {
      setError('Enter a valid 8–14 digit barcode.')
      return
    }

    if (busy.current) return

    busy.current = true
    setLoading(true)
    setError('')
    setProduct(null)
    setBarcode(code)

    await stopCamera()

    try {
      const response = await fetch(
        `/api/barcode/${encodeURIComponent(code)}`
      )

      const data = await response.json() as
        BarcodeProduct & { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Product lookup failed.')
      }

      if (!mounted.current) return

      setProduct(data)
      setCorrected({
        calories: data.calories === null ? '' : String(data.calories),
        protein: data.protein === null ? '' : String(data.protein),
        carbs: data.carbs === null ? '' : String(data.carbs),
        fat: data.fat === null ? '' : String(data.fat),
      })
      setAmountInput(
        String(data.servingSize ?? 100)
      )
      setServingsInput('1')
      setMode(
        data.servingSize !== null
          ? 'servings'
          : 'amount'
      )
    } catch (caught) {
      if (!mounted.current) return

      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not find this product.'
      )
    } finally {
      busy.current = false

      if (mounted.current) {
        setLoading(false)
      }
    }
  }

  async function startCamera() {
    if (scanner.current || starting || loading) return

    setError('')
    setStarting(true)

    try {
      const instance = new Html5Qrcode(
        scannerId,
        {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
        }
      )

      scanner.current = instance

      await instance.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => ({
            width: Math.min(width * 0.9, 320),
            height: Math.min(height * 0.5, 150),
          }),
        },
        decoded => {
          if (!busy.current && /^\d{8,14}$/.test(decoded)) {
            void lookup(decoded)
          }
        },
        () => {
          // A frame without a barcode is normal.
        }
      )

      if (!mounted.current) {
        await instance.stop()
      } else {
        setCameraActive(true)
      }
    } catch {
      setError(
        'Could not start the camera. Allow camera access in Safari, or enter the barcode manually.'
      )
      scanner.current = null
    } finally {
      if (mounted.current) {
        setStarting(false)
      }
    }
  }

  const number = (text: string) =>
    text.trim() === '' ? NaN : Number(text)

  const amount = product
    ? mode === 'servings' && product.servingSize !== null
      ? number(servingsInput) * product.servingSize
      : number(amountInput)
    : NaN

  const validAmount =
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= 100000

  const keys = ['calories', 'protein', 'carbs', 'fat'] as const
  const complete = keys.every(key => {
    const value = corrected[key].trim() === '' ? NaN : Number(corrected[key])
    return Number.isFinite(value) && value >= 0 && value <= 100000
  })
  const perHundred: BarcodeNutrition | null = complete ? {
    calories: Number(corrected.calories),
    protein: Number(corrected.protein),
    carbs: Number(corrected.carbs),
    fat: Number(corrected.fat),
  } : null
  const nutrition: BarcodeNutrition | null =
    perHundred && validAmount ? {
      calories: perHundred.calories * amount / 100,
      protein: perHundred.protein * amount / 100,
      carbs: perHundred.carbs * amount / 100,
      fat: perHundred.fat * amount / 100,
    } : null
  const missing = product ? keys.filter(key => product[key] === null) : []
  const changed = product ? keys.some(key => product[key] !== null &&
    corrected[key] !== String(product[key])) : false

  return (
    <section className="barcode-panel">
      <div className="barcode-heading">
        <div>
          <h3>Scan Food Barcode</h3>
          <p>
            Scan a packaged product or enter its barcode.
          </p>
        </div>

        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <div
        id={scannerId}
        className="barcode-camera"
      />

      <div className="barcode-controls">
        {!cameraActive ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={starting || loading}
          >
            {starting ? 'Starting camera...' : '📷 Open Camera'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stopCamera()}
          >
            Stop Camera
          </button>
        )}
      </div>

      <form
        className="barcode-manual"
        onSubmit={event => {
          event.preventDefault()
          void lookup(barcode)
        }}
      >
        <label htmlFor="barcode-number">
          Enter barcode manually
        </label>

        <div>
          <input
            id="barcode-number"
            value={barcode}
            onChange={event =>
              setBarcode(event.target.value.replace(/\D/g, ''))
            }
            inputMode="numeric"
            placeholder="UPC / EAN barcode"
            maxLength={14}
          />

          <button
            type="submit"
            disabled={loading || starting}
          >
            {loading ? 'Finding...' : 'Find Food'}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="barcode-error">
          <p>{error}</p>
          <button type="button" onClick={onManual}>
            Enter this food manually
          </button>
        </div>
      )}

      {product && (
        <div className="barcode-product">
          <p className="barcode-source">Open Food Facts</p>

          <h3>{product.name}</h3>

          {product.brand && <p>{product.brand}</p>}

          <p className="barcode-description">
            Nutrition per 100 {product.servingUnit}. Check each value against the package label.
          </p>
          {(missing.length > 0 || changed) && (
            <p className="barcode-disclaimer" role="status">
              {missing.length > 0
                ? `Missing: ${missing.join(', ')}. Enter the missing values from the label before logging.`
                : 'You have adjusted the database values. Your corrections will be used for this entry.'}
            </p>
          )}
          <div className="barcode-preview barcode-edit-grid">
            {keys.map(key => (
              <label key={key}>
                {key === 'calories' ? 'Calories per 100' : `${key.charAt(0).toUpperCase() + key.slice(1)} (g) per 100`}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="Required"
                  value={corrected[key]}
                  onChange={event => setCorrected(current => ({
                    ...current, [key]: event.target.value,
                  }))}
                />
              </label>
            ))}
          </div>

          <div className="barcode-mode">
            <button
              type="button"
              className={mode === 'amount' ? 'selected' : ''}
              onClick={() => setMode('amount')}
            >
              {product.servingUnit === 'ml' ? 'Milliliters' : 'Grams'}
            </button>

            {product.servingSize !== null && (
              <button
                type="button"
                className={mode === 'servings' ? 'selected' : ''}
                onClick={() => setMode('servings')}
              >
                Servings
              </button>
            )}
          </div>

          {mode === 'servings' &&
          product.servingSize !== null ? (
            <label>
              Number of servings
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={servingsInput}
                onChange={event =>
                  setServingsInput(event.target.value)
                }
              />
              <small>
                1 serving = {format(product.servingSize)}
                {' '}{product.servingUnit}
                {product.servingDescription
                  ? ` (${product.servingDescription})`
                  : ''}
              </small>
            </label>
          ) : (
            <label>
              Amount ({product.servingUnit})
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={amountInput}
                onChange={event =>
                  setAmountInput(event.target.value)
                }
              />
            </label>
          )}

          {nutrition && (
            <div className="barcode-preview">
              <div>
                <strong>{format(nutrition.calories)}</strong>
                <span>Calories</span>
              </div>
              <div>
                <strong>{format(nutrition.protein)} g</strong>
                <span>Protein</span>
              </div>
              <div>
                <strong>{format(nutrition.carbs)} g</strong>
                <span>Carbs</span>
              </div>
              <div>
                <strong>{format(nutrition.fat)} g</strong>
                <span>Fat</span>
              </div>
            </div>
          )}

          <button
            className="barcode-add"
            type="button"
            disabled={!nutrition}
            onClick={() => {
              if (nutrition && validAmount && perHundred) {
                onAdd(product, amount, nutrition, perHundred)
              }
            }}
          >
            Add to Food Diary
          </button>

          <p className="barcode-disclaimer">
            Nutrition comes from community-contributed
            product records. Compare values with the package
            label when possible.
          </p>
        </div>
      )}
    </section>
  )
}

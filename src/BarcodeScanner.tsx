
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
  calories: number
  protein: number
  carbs: number
  fat: number
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
    nutrition: BarcodeNutrition
  ) => void
  onCancel: () => void
}

const scannerId = 'nutrition-barcode-camera'

function format(number: number): string {
  return Number(number.toFixed(2)).toLocaleString()
}

export default function BarcodeScanner({
  onAdd,
  onCancel,
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

  const nutrition: BarcodeNutrition | null =
    product && validAmount
      ? {
          calories: product.calories * amount / 100,
          protein: product.protein * amount / 100,
          carbs: product.carbs * amount / 100,
          fat: product.fat * amount / 100,
        }
      : null

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
        <p role="alert" className="barcode-error">
          {error}
        </p>
      )}

      {product && (
        <div className="barcode-product">
          <p className="barcode-source">Open Food Facts</p>

          <h3>{product.name}</h3>

          {product.brand && <p>{product.brand}</p>}

          <p className="barcode-description">
            Per 100 {product.servingUnit}:{' '}
            {format(product.calories)} kcal ·
            P {format(product.protein)} g ·
            C {format(product.carbs)} g ·
            F {format(product.fat)} g
          </p>

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
              if (nutrition && validAmount) {
                onAdd(product, amount, nutrition)
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

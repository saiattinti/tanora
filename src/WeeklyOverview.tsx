import { useCallback, useEffect, useState } from 'react'
import type { NutritionData, SavedEntry } from './lib/nutritionStorage'
import { loadNutritionData } from './lib/nutritionStorage'
import { readGuestData } from './lib/guestStorage'
import { loadWorkoutData } from './lib/workoutStorage'
import { completedSets, totalVolume } from './lib/workoutTypes'
import type { WorkoutSession } from './lib/workoutTypes'
import { formatWeight, readWeightUnit } from './lib/workoutUnits'
import './WeeklyOverview.css'

type WeekDay = {
  date: string
  label: string
  calorieTotal: number
  proteinTotal: number
  foodCount: number
  workouts: number
  workingSets: number
  volumeLb: number
}
type OverviewData = { nutrition: NutritionData, history: WorkoutSession[] }
function dateKeyLocal(date: Date): string {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-')
}

// Work in local calendar dates, not UTC day slices, to avoid shifting dates on iPhone.
function lastSevenDays(): {date:string,label:string}[] {
  const today=new Date()
  return Array.from({length:7},(_,i)=>{
    const value=new Date(today.getFullYear(),today.getMonth(),today.getDate()-(6-i))
    return {date:dateKeyLocal(value),label:value.toLocaleDateString(undefined,{weekday:'short'})}
  })
}

function summarizeWeek(entries:SavedEntry[],history:WorkoutSession[],dates:{date:string,label:string}[]):WeekDay[] {
  return dates.map(day=>{
    const foods=entries.filter(entry=>entry.date===day.date)
    const workouts=history.filter(session=>session.date===day.date)
    return {
      ...day,
      calorieTotal:foods.reduce((total,item)=>total+item.calories,0),
      proteinTotal:foods.reduce((total,item)=>total+item.protein,0),
      foodCount:foods.length,
      workouts:workouts.length,
      workingSets:workouts.reduce((total,session)=>total+completedSets(session),0),
      volumeLb:workouts.reduce((total,session)=>total+totalVolume(session),0),
    }
  })
}

const fmt=(value:number,decimals=0)=>Number.isFinite(value)?value.toLocaleString(undefined,{maximumFractionDigits:decimals}):'0'

export default function WeeklyOverview({userId}:{userId:string|null}) {
  const [data,setData]=useState<OverviewData|null>(null)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [lastUpdated,setLastUpdated]=useState('')
  const [today,setToday]=useState(()=>dateKeyLocal(new Date()))
  const unit=readWeightUnit()

  const refresh=useCallback(async()=>{
    setLoading(true)
    setError('')
    try {
      const [nutrition,workoutData]=await Promise.all([
        userId ? loadNutritionData(userId) : Promise.resolve(readGuestData()),
        loadWorkoutData(userId),
      ])
      setData({nutrition,history:workoutData.history})
      setToday(dateKeyLocal(new Date()))
      setLastUpdated(new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}))
    }catch(caught) {
      setError(caught instanceof Error?caught.message:'Could not load weekly activity.')
    }finally{setLoading(false)}
  },[userId])

  useEffect(()=>{
    // Schedule the initial data load after the effect completes, rather than
    // synchronously setting loading state during an effect.
    const scheduled = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(scheduled)
  },[refresh])
  useEffect(()=>{
    const check=()=>{
      if(document.visibilityState==='visible') {
        if(dateKeyLocal(new Date())!==today) {
          setToday(dateKeyLocal(new Date()))
        }
        void refresh()
      }
    }
    document.addEventListener('visibilitychange',check)
    return ()=>document.removeEventListener('visibilitychange',check)
  },[today,refresh])

  const dates=lastSevenDays()
  const days=summarizeWeek(data?.nutrition.entries??[],data?.history??[],dates)
  const foodDays=days.filter(day=>day.foodCount>0)
  const workouts=days.reduce((total,day)=>total+day.workouts,0)
  const workingSets=days.reduce((total,day)=>total+day.workingSets,0)
  const volume=days.reduce((total,day)=>total+day.volumeLb,0)
  const calorieAverage=foodDays.length ? foodDays.reduce((sum,day)=>sum+day.calorieTotal,0)/foodDays.length : null
  const proteinAverage=foodDays.length ? foodDays.reduce((sum,day)=>sum+day.proteinTotal,0)/foodDays.length : null
  const chartMax=Math.max(1,...days.map(day=>day.calorieTotal))
  const [first,last]=[dates[0].date,dates[6].date]
  const rangeLabel=new Date(first+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})+
    ' – '+new Date(last+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})

  return <main className="weekly-overview">
    <header className="weekly-overview-heading">
      <div>
        <p className="eyebrow">TANORA · WEEKLY OVERVIEW</p>
        <h1>Nutrition + Training</h1>
        <p className="subtitle">{rangeLabel} · Last 7 calendar days, including today</p>
      </div>
      <button type="button" className="settings-button" disabled={loading} onClick={()=>void refresh()}>{loading?'Refreshing…':'Refresh'}</button>
    </header>
    {error&&<div className="card weekly-error" role="alert">Could not refresh your overview: {error}. {data?'Showing the last successfully loaded information.':'Try Refresh again.'}</div>}
    {loading&&!data&&<section className="card"><p>Loading your recent nutrition and workouts…</p></section>}
    {data&&<>
      <section className="card weekly-section">
        <div className="weekly-section-title"><h2>Nutrition</h2><span>{foodDays.length}/7 days with food entries</span></div>
        <div className="weekly-metrics">
          <div><small>Average logged-day calories</small><strong>{calorieAverage===null?'No logs':fmt(calorieAverage)}</strong><span>{calorieAverage===null?'':'kcal/day'}</span></div>
          <div><small>Average logged-day protein</small><strong>{proteinAverage===null?'No logs':fmt(proteinAverage,1)}</strong><span>{proteinAverage===null?'':'g/day'}</span></div>
          <div><small>Days with food entries</small><strong>{foodDays.length} / 7</strong><span>Not necessarily full days</span></div>
        </div>
        <div className="weekly-bars" aria-label="Calories logged each day in the last seven days">
          {days.map(day=><div className="weekly-bar-day" key={day.date} title={day.foodCount?day.date+': '+fmt(day.calorieTotal)+' kcal':day.date+': No food logged'}>
            <span className="weekly-bar-value">{day.foodCount?fmt(day.calorieTotal):'—'}</span>
            <div className="weekly-bar-track">
              {day.foodCount>0&&<div className="weekly-bar-fill" style={{height:Math.max(3,day.calorieTotal/chartMax*100)+'%'}}/>}
            </div>
            <strong>{day.label}</strong>
            <small>{day.foodCount?'Logged':'No log'}</small>
          </div>)}
        </div>
        <p className="weekly-footnote">Averages include only days with food entries. Missing days are not counted as zero, and partially logged days may underestimate actual intake.</p>
      </section>

      <section className="card weekly-section">
        <div className="weekly-section-title"><h2>Workouts</h2><span>Saved sessions within this date range</span></div>
        <div className="weekly-metrics">
          <div><small>Workouts completed</small><strong>{workouts}</strong><span>saved sessions</span></div>
          <div><small>Working sets</small><strong>{workingSets}</strong><span>warm-up sets excluded</span></div>
          <div><small>Working-set volume</small><strong>{fmt(unit==='kg'?volume/2.20462262185:volume,1)}</strong><span>{unit} × reps</span></div>
        </div>
        <div className="weekly-activity">
          {days.map(day=><div className="weekly-activity-day" key={day.date}>
            <span>{day.label}</span>
            <strong>{day.workouts?day.workouts+' workout'+(day.workouts===1?'':'s'):'Rest / no workout logged'}</strong>
            <small>{day.workouts ? day.workingSets+' working sets · '+formatWeight(day.volumeLb,unit)+' volume' : '—'}</small>
          </div>)}
        </div>
        <p className="weekly-footnote">Volume is the sum of working-set weight × repetitions; warm-up sets are excluded. A day without a saved workout is shown as no workout logged.</p>
      </section>
      <p className="footer-note">{userId?'Private account records are read from Supabase.':'Guest records are read from this browser only.'} {lastUpdated?'Last refreshed '+lastUpdated+'.':''}</p>
    </>}
  </main>
}

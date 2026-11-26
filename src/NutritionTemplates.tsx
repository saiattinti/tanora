import { useState } from 'react'
import { searchIngredients } from './usda'
import type { SavedFood, SavedEntry, NutritionGoals } from './lib/nutritionStorage'
import type { SavedMeal, SavedRecipe, IngredientPortion } from './lib/nutritionTemplates'
import { portionMacros, recipeAsFood } from './lib/nutritionTemplates'
import { instantFor, localClock } from './lib/foodTimes'
import './NutritionTemplates.css'

type Kind = 'meal' | 'recipe'
const zero: NutritionGoals = {calories:0,protein:0,carbs:0,fat:0}
function n(value:number){return Number.isFinite(value)?value.toFixed(1):'0.0'}
function scaleMacros(macros:NutritionGoals, factor:number):NutritionGoals{
  return {calories:macros.calories*factor,protein:macros.protein*factor,carbs:macros.carbs*factor,fat:macros.fat*factor}
}
function Summary({macros}:{macros:NutritionGoals}){
  return <p className="template-macros">{Math.round(macros.calories)} kcal · P {n(macros.protein)} g · C {n(macros.carbs)} g · F {n(macros.fat)} g</p>
}
type Props = {
  meals: SavedMeal[]
  recipes: SavedRecipe[]
  availableFoods: SavedFood[]
  date:string
  initialKind?: Kind
  busy:boolean
  onSaveMeal:(meal:SavedMeal)=>Promise<boolean>
  onSaveRecipe:(recipe:SavedRecipe)=>Promise<boolean>
  onDelete:(kind:Kind,id:string)=>Promise<void>
  onLogMeal:(entries:SavedEntry[])=>Promise<boolean>
  onLogRecipe:(entry:SavedEntry)=>Promise<boolean>
}
export default function NutritionTemplates({
  meals,recipes,availableFoods,date,initialKind='meal',busy,onSaveMeal,onSaveRecipe,onDelete,onLogMeal,onLogRecipe,
}:Props){
  const [kind,setKind]=useState<Kind>(initialKind)
  const [editing,setEditing]=useState<string|null>(null)
  const [name,setName]=useState('')
  const [items,setItems]=useState<IngredientPortion[]>([])
  const [yieldGrams,setYieldGrams]=useState('500')
  const [portions,setPortions]=useState('4')
  const [search,setSearch]=useState('')
  const [results,setResults]=useState<SavedFood[]>([])
  const [searching,setSearching]=useState(false)
  const [error,setError]=useState('')
  const [multiplier,setMultiplier]=useState<Record<string,string>>({})
  const [recipeMode,setRecipeMode]=useState<Record<string,'grams'|'servings'>>({})
  const [mealRecipeUnits,setMealRecipeUnits]=useState<Record<string,'grams'|'servings'>>({})
  const [expanded,setExpanded]=useState(true)
  const [mealTime,setMealTime]=useState(localClock)
  const [mealTimeEdited,setMealTimeEdited]=useState(false)
  const logTime=()=>mealTimeEdited && mealTime ? mealTime : localClock()
  const [editingOpen,setEditingOpen]=useState(false)
  const existing=kind==='meal'?meals:recipes
  const totals=items.length?portionMacros(items):zero

  function reset(){
    setEditingOpen(false);setEditing(null);setName('');setItems([]);setSearch('');setResults([]);setError('')
    setYieldGrams('500');setPortions('4')
  }
  function edit(record:SavedMeal|SavedRecipe,next:Kind){
    setKind(next);setEditing(record.id);setEditingOpen(true);setName(record.name);setSearch('');setResults([]);setError('')
    if(next==='meal'){
      setItems((record as SavedMeal).items.map(part=>({...part,id:crypto.randomUUID()})))
    } else {
      const recipe=record as SavedRecipe
      setItems(recipe.ingredients.map(part=>({...part,id:crypto.randomUUID()})))
      setYieldGrams(String(recipe.yieldGrams));setPortions(String(recipe.portions))
    }
  }
  function add(food:SavedFood){
    setItems(old=>[...old,{id:crypto.randomUUID(),food:{...food},amount:food.servingSize??100}])
    setSearch('');setResults([]);setError('')
  }
  function addRecipeIngredient(recipe:SavedRecipe){
    try {
      // Saved as a food snapshot, not a live reference to the recipe.
      const food=recipeAsFood(recipe)
      const id=crypto.randomUUID()
      setItems(old=>[...old,{id,food,amount:food.servingSize??100}])
      setMealRecipeUnits(old=>({...old,[id]:'servings'}))
      setSearch('');setError('')
    }catch(e){setError(e instanceof Error?e.message:'Could not add recipe.')}
  }
  function ingredientAmount(part:IngredientPortion):number {
    const size=part.food.servingSize??100
    return part.food.source==='Tanora recipe' && mealRecipeUnits[part.id]==='servings'
      ? Number((part.amount/size).toFixed(4)):part.amount
  }
  function editIngredientAmount(part:IngredientPortion, raw:string){
    const value=raw.trim()===''?0:Number(raw)
    const byServings=part.food.source==='Tanora recipe' && mealRecipeUnits[part.id]==='servings'
    const next=byServings?value*(part.food.servingSize??100):value
    setItems(old=>old.map(item=>item.id===part.id?{...item,amount:next}:item))
  }
  async function doSearch(){
    if(!search.trim()||searching)return
    setSearching(true);setError('')
    try {
      const found=await searchIngredients(search)
      setResults([...found.recommended,...found.more].slice(0,18).map(food=>({...food,unit:food.unit??'g'})))
    }catch(e){setError(e instanceof Error?e.message:'Ingredient search failed.')}
    finally{setSearching(false)}
  }
  async function save(){
    if(busy)return
    const title=name.trim()
    if(!title || items.length===0 || items.some(item=>!Number.isFinite(item.amount)||item.amount<=0)){
      setError('Enter a name and valid amounts for at least one ingredient.');return
    }
    const id=editing??crypto.randomUUID()
    if(kind==='meal'){
      if(await onSaveMeal({id,name:title,items}))reset()
    }else{
      const cooked=Number(yieldGrams), servingCount=Number(portions)
      if(!Number.isFinite(cooked)||cooked<=0||!Number.isFinite(servingCount)||servingCount<=0){
        setError('Enter a valid cooked yield and number of servings.');return
      }
      if(await onSaveRecipe({id,name:title,ingredients:items,yieldGrams:cooked,portions:servingCount}))reset()
    }
  }
  async function logMeal(meal:SavedMeal){
    const factor=Number(multiplier[meal.id]??'1')
    if(!Number.isFinite(factor)||factor<=0||factor>100){setError('Enter a multiplier greater than zero.');return}
    const at=instantFor(date,logTime())
    const entries:SavedEntry[]=meal.items.map(part=>{
      const amount=part.amount*factor
      return {id:crypto.randomUUID(),name:part.food.name,grams:amount,date,eatenAt:at,unit:part.food.unit??'g',
        food:{...part.food},...scaleMacros(part.food,amount/100)}
    })
    if(await onLogMeal(entries))setError('')
  }
  async function logRecipe(recipe:SavedRecipe){
    const raw=Number(multiplier[recipe.id]??'1')
    if(!Number.isFinite(raw)||raw<=0){setError('Enter a valid amount to log.');return}
    const useServings=(recipeMode[recipe.id]??'servings')==='servings'
    const grams=useServings?(recipe.yieldGrams/recipe.portions)*raw:raw
    if(grams>100000){setError('Maximum log amount is 100,000 grams.');return}
    const batch=portionMacros(recipe.ingredients)
    const per100=scaleMacros(batch,100/recipe.yieldGrams)
    const food=recipeAsFood(recipe)
    const entry:SavedEntry={id:crypto.randomUUID(),name:food.name,date,eatenAt:instantFor(date,logTime()),
      grams,unit:'g',food,...scaleMacros(per100,grams/100)}
    if(await onLogRecipe(entry))setError('')
  }

  return <section className="card template-section">
    <div className="template-heading"><div><h2>Saved Meals & Recipes</h2><p className="form-description">Build once, log again. Recipes calculate nutrition from cooked yield.</p></div>
      <button type="button" className="add-button" onClick={()=>{if(!expanded){setMealTime(localClock());setMealTimeEdited(false)}setExpanded(!expanded)}}>{expanded?'Hide':'Open'}</button></div>
    {expanded&&<>
      <label className="template-logtime">Log time (local)
        <input type="time" value={mealTime} onChange={e=>{setMealTime(e.target.value);setMealTimeEdited(true)}}/>
        <small>Defaults to the time you log the meal. Change it to log an earlier meal.</small>
      </label>
      <div className="template-tabs">
        <button type="button" className={kind==='meal'?'selected':''} onClick={()=>{setKind('meal');reset()}}>Saved Meals ({meals.length})</button>
        <button type="button" className={kind==='recipe'?'selected':''} onClick={()=>{setKind('recipe');reset()}}>Recipes ({recipes.length})</button>
      </div>
      {!editingOpen&&<button className="add-button" type="button" onClick={()=>{reset();setEditingOpen(true)}}>+ Create {kind==='meal'?'meal':'recipe'}</button>}
      {editingOpen&&<div className="template-editor">
        <h3>{editing?'Edit':'Create'} {kind==='meal'?'meal':'recipe'}</h3>
        <label>Name<input value={name} maxLength={80} placeholder={kind==='meal'?'e.g. Usual Lunch':'e.g. Chicken Curry'} onChange={e=>setName(e.target.value)}/></label>
        <p className="form-description">Select past foods, favorites, or search USDA. Saved recipes can be used directly in meals by cooked grams or servings. Nutrition is saved as a snapshot.</p>
        {kind==='meal'&&recipes.length>0&&<div className="template-recipe-picker">
          <strong>Add a saved recipe to this meal</strong>
          <div className="template-food-picks">
            {recipes.map(recipe=><button key={recipe.id} type="button" onClick={()=>addRecipeIngredient(recipe)}>
              + {recipe.name} <small>({Number((recipe.yieldGrams/recipe.portions).toFixed(1))} g per serving)</small>
            </button>)}
          </div>
        </div>}
        <div className="template-search"><input type="search" placeholder="Search an ingredient..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <button type="button" className="add-button" disabled={searching||!search.trim()} onClick={()=>void doSearch()}>{searching?'Searching':'USDA Search'}</button></div>
        <div className="template-food-picks">{[...availableFoods.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())).slice(0,8),...results].filter((f,i,all)=>all.findIndex(e=>e.id===f.id)===i).slice(0,20).map(food=><button key={food.id} type="button" onClick={()=>add(food)}>+ {food.name} <small>({Math.round(food.calories)} kcal/100 {food.unit??'g'})</small></button>)}</div>
        {items.map((part,i)=><div className="template-ingredient" key={part.id}>
          <span>{part.food.name}{part.food.source==='Tanora recipe'&&<small className="template-recipe-label">Saved recipe · cooked portion</small>}</span>
          <label>Amount
            <input type="number" min="0.1" step="any" aria-label={part.food.name+' amount'} value={ingredientAmount(part)} onChange={e=>editIngredientAmount(part,e.target.value)}/>
          </label>
          {part.food.source==='Tanora recipe'&&kind==='meal'
            ? <select aria-label={part.food.name+' portion unit'} value={mealRecipeUnits[part.id]??'grams'} onChange={e=>setMealRecipeUnits(old=>({...old,[part.id]:e.target.value as 'grams'|'servings'}))}>
                <option value="grams">g cooked</option><option value="servings">Servings</option>
              </select>
            : <small className="template-ingredient-unit">{part.food.unit??'g'}</small>}
          <button type="button" className="delete-button" onClick={()=>setItems(old=>old.filter(p=>p.id!==part.id))}>Remove</button>
          <small>#{i+1}</small>
        </div>)}
        {kind==='recipe'&&<div className="template-double">
          <label>Cooked recipe yield (grams)<input type="number" min="0.1" step="any" value={yieldGrams} onChange={e=>setYieldGrams(e.target.value)}/></label>
          <label>Number of servings<input type="number" min="0.1" step="any" value={portions} onChange={e=>setPortions(e.target.value)}/></label>
        </div>}
        <Summary macros={kind==='recipe'&&Number(portions)>0?scaleMacros(totals,1/Number(portions)):totals}/>
        <p className="form-description">{kind==='recipe'?'Nutrition per serving; ingredient totals are preserved despite cooking weight changes.':'Nutrition for the whole saved meal.'}</p>
        <div className="template-buttons"><button type="button" className="add-button" disabled={busy} onClick={()=>void save()}>Save {kind}</button><button type="button" className="settings-button" onClick={reset}>Cancel</button></div>
      </div>}
      {existing.length===0&&!editingOpen&&<p className="form-description">Nothing saved yet. Create your first {kind}.</p>}
      {existing.map(record=>{
        const meal=kind==='meal'?record as SavedMeal:null
        const recipe=kind==='recipe'?record as SavedRecipe:null
        const nutrition=portionMacros(meal?.items??recipe?.ingredients??[])
        return <div className="template-saved" key={record.id}>
          <div><strong>{record.name}</strong>
            <Summary macros={meal?nutrition:scaleMacros(nutrition,1/recipe!.portions)}/>
            <small>{meal?meal.items.length+' foods':recipe!.ingredients.length+' ingredients · '+n(recipe!.yieldGrams)+' g cooked'}</small></div>
          <div className="template-amount">
            <label>{meal?'Meal servings':'Log amount'}
              <input type="number" min="0.1" step="any" value={multiplier[record.id]??'1'} onChange={e=>setMultiplier(old=>({...old,[record.id]:e.target.value}))}/></label>
            {recipe&&<select aria-label="Recipe log unit" value={recipeMode[record.id]??'servings'} onChange={e=>setRecipeMode(old=>({...old,[record.id]:e.target.value as 'grams'|'servings'}))}>
              <option value="servings">Servings</option><option value="grams">Grams cooked</option></select>}
          </div>
          <div className="template-buttons"><button className="add-button" type="button" disabled={busy} onClick={()=>void (meal?logMeal(meal):logRecipe(recipe!))}>+ Log on selected date</button>
            <button className="settings-button" type="button" disabled={busy} onClick={()=>edit(record,kind)}>Edit</button>
            <button className="delete-button" type="button" disabled={busy} onClick={()=>{if(window.confirm('Delete saved '+kind+'? Past logs remain intact.'))void onDelete(kind,record.id)}}>Delete</button></div>
        </div>
      })}
      {error&&<p className="search-error" role="alert">{error}</p>}
    </>}
  </section>
}

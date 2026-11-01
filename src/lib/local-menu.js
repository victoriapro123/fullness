import {isCalendarDate, santiagoDate, formatAvailabilityDate} from './product-availability.js';

export const MENU_SECTIONS = [
  ['lunch','Fullness Lunch'], ['individuales','Platos para llevar'], ['bowls','Bowls'],
  ['ensaladas','Ensaladas'], ['desayuno','Desayuno'], ['cafeteria','Cafetería'],
  ['jugos','Jugos y bebidas'], ['snacks','Snacks'], ['mealpreps','Mealpreps']
];
export const AVAILABILITY_STATES = [['unconfirmed','Por confirmar'],['available','Con disponibilidad confirmada'],['sold_out','Agotado'],['paused','Oculto']];
export const PLAN_CONDITIONS = [
  'Semanal: 6 mealpreps. Mensual: 4 semanas identificadas de 6, 24 en total.',
  'Por semana puedes elegir 6 platos diferentes o 5 diferentes con uno de ellos dos veces. Sólo un plato puede duplicarse; nunca 3 del mismo.',
  'Los mealpreps normales sólo se asignan a planes. Los familiares se venden por separado y no cuentan entre los 6.',
  'El total del plan es la suma de sus platos. Despacho separado; los precios y la disponibilidad se comprueban de nuevo antes de pagar.',
  'Agregar al carrito no reserva stock. Si cambia la carta, el precio o el stock, debes revisar la selección antes de continuar.'
];
export const moneyClp = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
export function availabilityStatus(row, now = new Date()) {
  const state=row?.state || 'unconfirmed', today=santiagoDate(now);
  if(state==='paused')return {available:false,code:'paused',label:'No disponible'};
  if(state==='sold_out')return {available:false,code:'sold_out',label:'Agotado'};
  if(state!=='available')return {available:false,code:'unconfirmed',label:'Disponibilidad por confirmar'};
  if(row.startsOn && (!isCalendarDate(row.startsOn)||today<row.startsOn))return {available:false,code:'scheduled',label:`Disponible desde ${formatAvailabilityDate(row.startsOn)}`};
  if(row.endsOn && (!isCalendarDate(row.endsOn)||today>row.endsOn))return {available:false,code:'ended',label:'Período finalizado'};
  return {available:true,code:'available',label:'Disponible'};
}
export function validateAvailability(row) {
  if(!AVAILABILITY_STATES.some(([id])=>id===row.state))throw Error('Selecciona un estado válido.');
  for(const key of ['startsOn','endsOn'])if(row[key]&&!isCalendarDate(row[key]))throw Error('Revisa las fechas de disponibilidad.');
  if(row.endsOn&&row.startsOn&&row.endsOn<row.startsOn)throw Error('La fecha final debe ser igual o posterior a la inicial.');
}
export const EMPTY_LOCAL_MENU = {lunchPrice:13500,lunchDescription:'Incluye mini ensalada, jugo de naranja o agua mineral y espresso o cortado chico.',items:[]};

// Approved HTML content is a starting DRAFT, never evidence of current stock.
export function approvedMenuDraft() {
  const rows=[
    ['desayuno','Avocado & Egg Toast','Tostada de pan artesanal sin gluten con palta, huevo, chutney de tomate y rúcula. Incluye jugo de naranja pequeño y espresso o cortado chico.',9900],
    ['bowls','Salmon & Chickpea Bowl','Garbanzos, cilantro, tomate, cebollín, palta y 100 g de salmón sous vide.',10900],
    ['bowls','Quinoa & Lentil Tabbouleh','Quinoa, lentejas, menta, cilantro, tomate y dos huevos duros.',6490],
    ['ensaladas','Apple, Goat Cheese & Chicken Salad','Hojas verdes, rúcula, queso de cabra, pollo grillado, nueces acarameladas, manzana, maravilla y dressing de aceto balsámico.',11900],
    ...[['Ristretto',2000],['Espresso',2000],['Cortado chico',2600],['Lungo',2600],['Cappuccino',3200],['Latte Macchiato chico',3200],['Latte Macchiato grande',3900]].map(([n,p])=>['cafeteria',n,'',p]),
    ...[['Jugo de naranja natural',4200],['Jugo prensado en frío · 300 ml',4200],['Agua mineral con gas',2000],['Agua mineral sin gas',2000]].map(([n,p])=>['jugos',n,'',p]),
    ...[['Chips de camote',1500],['Barra Fit de coco y chocolate',2000],['Turrón de maní',2000],['Turrón de semillas',2000],['Barra artesanal de dátiles, frutos secos y cacao · 63 g',2500],['Carrot Cake',3200]].map(([n,p])=>['snacks',n,'',p])
  ];
  return {...EMPTY_LOCAL_MENU,items:rows.map(([section,name,description,price],i)=>({id:`local-${i+1}`,section,name,description,price,state:'unconfirmed',startsOn:'',endsOn:'',libraryMealId:'',lunchSlot:null}))};
}

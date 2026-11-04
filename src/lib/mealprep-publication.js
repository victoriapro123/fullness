export function validMealprepPrice(value) {
  if (!['string','number'].includes(typeof value) || String(value).trim()==='') return false;
  const price=Number(value);
  return Number.isSafeInteger(price)&&price>=1&&price<=1000000;
}

export function mealprepPublicationState(form={},saved=null) {
  const priceValid=validMealprepPrice(form.salePriceClp);
  const priceEmpty=form.salePriceClp==null||String(form.salePriceClp).trim()==='';
  const published=Boolean(saved?.isActive&&saved?.availableForPlans&&validMealprepPrice(saved?.salePriceClp));
  const willPublish=priceValid&&form.availableForPlans===true;
  return {priceValid,priceEmpty,published,willPublish,
    liveLabel:published?'Disponible en la tienda':saved?.id?'No disponible en la tienda':'Aún no publicado',
    saveLabel:willPublish?'Guardar y publicar':published?'Guardar y ocultar':'Guardar sin publicar',
    priceError:!priceEmpty&&!priceValid?'Ingresa un precio entre $1 y $1.000.000, sin decimales.':'',
    nextStep:willPublish?'Al guardar, los clientes podrán elegirlo en Arma tu plan.':published?'Al guardar, dejará de ofrecerse en Arma tu plan.':!priceValid?'Agrega un precio para poder ofrecerlo. Puedes guardar la ficha sin publicarla.':'Al guardar, la ficha se conservará sin ofrecerse en la tienda.'};
}

export function mealprepDraftLabel(status,dirty) {
  if(!dirty)return 'Sin cambios pendientes';
  return status==='saving'?'Respaldando borrador…':status==='synced'?'Borrador respaldado · Sin publicar':status==='local'?'Borrador en este dispositivo · Sin publicar':'Cambios sin publicar';
}

export function mealprepFormChange(current,{name,type,value,checked}) {
  return {...current,[name]:type==='checkbox'?checked:value,
    ...(name==='salePriceClp'&&!validMealprepPrice(value)?{availableForPlans:false}:{})};
}

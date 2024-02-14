var area = ee.FeatureCollection("projects/ee-riesgutierrez/assets/MUN_SANTANDER_MAGNA");
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD");

/*El siguiente script crea un mapa del indice de amenaza de sequia utilizando los indices
SPI (Indice Estandarizado de Precipitacion), SMI (Indice de Humedad del suelo), PDSI
(Indice de Severidad de Sequia de Palmer) y VHI (Indice de Condicion de Salud Vegetal).
Se utilizan colecciones de imagenes de UCSB-CHG/CHIRPS/PENTAD, NASA_USDA/HSL/SMAP10KM_soil_moisture,
IDAHO_EPSCOR/TERRACLIMATE, MODIS/061/MOD11A2 y MODIS/061/MOD13A1 para un area 
correspondiente al departamento de Santander, presentado en un archivo shapefile con 
los diferentes municipios del departamento*/

/*Traer el archivo shapefile correspondiente a los municipios de Santander y
definir los parametros para su visualizacion para adicionarla y centrarla en el mapa*/

var AOI = ee.FeatureCollection("projects/ee-riesgutierrez/assets/MUN_SANTANDER_MAGNA")

var poligono = ee.FeatureCollection("projects/ee-riesgutierrez/assets/MUN_SANTANDER_MAGNA")
        .style({color: "black", width: 1, fillColor: "00000000"});
Map.addLayer(poligono, {}, "Area de estudio")
Map.centerObject(area, 8)

/*Se crea una variable con la lista de clases*/

var clases = ['Extremadamente seco',
              'Severamente seco',
              'Moderadamente seco',
              'Normal',
              'Humedo']
              
/*Establecer la fecha de inicio y de finalizacion de la coleccion*/

var startDate = ee.Date.fromYMD(1983,1,1)
var endDate = ee.Date.fromYMD(2023,12,26)

/*Establecer la lista de años del periodo de 40 años de precipitacion para el analisis*/

var lpaYears = ee.List.sequence(1983,2023)
var months = ee.List.sequence(1,12)

/*Establecer el periodo a analizar entre el 2015-04-02 y 2022-08-02, teniendo en cuenta
que es el periodo de imagenes disponibles de la coleccion de imagenes 
NASA_USDA/HSL/SMAP10KM_soil_moisture*/

var fechaInicio = ee.Date.fromYMD(2016,1,1)
var fechaFinal = ee.Date.fromYMD(2016,2,26)

/*Generar para cada uno de los 40 años de la colección, el valor de los totales mensuales para
la coleccion de UCSB-CHG/CHIRPS/PENTAD tenidendo en cuenta que la coleccion inicial tiene informacion
con unidades en mm/pentada de precipitacion*/

var monthlyImages = lpaYears.map(function(year){
  return months.map(function(month){
    var filtered = chirps
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .filter(ee.Filter.calendarRange(month, month, 'month'))
    var monthly = filtered.sum()
    return monthly.set({'month': month, 'year': year})
  }) 
}).flatten()

/*Generar el valor de la precipitacion mensual para cada mes de la serie de los 40 años */

var monthlyCol = ee.ImageCollection.fromImages(monthlyImages)

print('coleccion precipitacion mensual', monthlyCol)

/*Generar el promedio de la precipitacion por mes de la serie de los 40 años */

var longTermMeans = months.map(function(month){
  var filtered = monthlyCol.filter(ee.Filter.eq('month', month))
  var monthlyMean = filtered.mean()
  return monthlyMean.set('month', month)
})
var monthlyRainfall = ee.ImageCollection.fromImages(longTermMeans)

print('precipitacion promedio mensual', monthlyRainfall)

/*Calcular la precipitacion mensual del periodo a analizar */

var filtered = chirps.filter(ee.Filter.date(fechaInicio, fechaFinal))

var monthlyTotals = months.map(function(month){
  return filtered
    .filter(ee.Filter.calendarRange(month, month, 'month'))
      .sum()
      .set('month', month)
})

var currentRainfall = ee.ImageCollection.fromImages(monthlyTotals)

print('precipitacion mensual del periodo a analizar', currentRainfall)

/*Establecer del periodo a analizar la precipitacion promedio de cada mes y 
la precipitacion observada mensual, tener encuenta que se debe ajustar en la
variable el mes inicial y final del periodo a analizar*/

var combinedFilter = ee.Filter.and(
  ee.Filter.gte('month', 1), ee.Filter.lte('month', 2))
// var rainfallNormal = monthlyRainfall.filter(combinedFilter).sum()
// var rainfallObserved = currentRainfall.filter(combinedFilter).sum()
var rainfallMedNorm = monthlyRainfall.filter(combinedFilter).mean()
var rainfallMedObser = currentRainfall.filter(combinedFilter).mean()

/*Calcular la anomalia de la precipitacion del periodo a analizar y visualizar para el area
de estudio*/

var seasonalDeviation = ((rainfallMedObser.subtract(rainfallMedNorm)).divide(rainfallMedNorm)).multiply(100)

var visParam = {min: -60, max: 20,
  palette: ['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4']
}

Map.addLayer(seasonalDeviation.clip(AOI), visParam, 'Anomalia de la precipitacion')

// throw('stop')


/*Establecer el Indice de Condiciones de Precipitacion PCI y ajustar los parametros
para su visualizacion en el mapa para el area de estudio*/

var PCI = monthlyCol.map(function(image){
  var Imin = monthlyCol.reduce(ee.Reducer.min())
  var Imax = monthlyCol.reduce(ee.Reducer.max())
    return image.expression('(Ia-Imin)/(Imax-Imin)*100',
      {
        Ia: rainfallMedObser,
        Imin: Imin,
        Imax: Imax
      }).clip(AOI).rename('PCI')
        })

var vispci = {min: 0, max: 100,
  palette: ['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4']
}

Map.addLayer(PCI, vispci, 'PCI del periodo')

//////////////*Calcular el Indice de Precipitacion Estandarizado SPI*////////////////////

/*Calcular la precipitacion media y la desviacion estandar de la coleccion para el
area de trabajo definida en el shapefile de municipios de Santander*/

var ltamean = monthlyCol.select('precipitation').mean().clip(AOI)
var ltastd =  monthlyCol.reduce(ee.Reducer.stdDev()).clip(AOI)

var spi = rainfallMedObser.subtract(ltamean).divide(ltastd)

/*Se crean los parametros de visualizacion de la variable SPI*/

var spicolor = ['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4']
var spi_viz = {min:-2, max:2, palette: spicolor}

/*Visualiza en el mapa el resultado del SPI*/

Map.addLayer(spi, spi_viz, 'SPI del periodo')

// throw('stop')

/*Se establecen los parametros de cada clase del indice SPI */

var spiclass = ee.Image(1)
              .where(spi.lte(-2), 1)
              .where(spi.gt(-2).and(spi.lte(-1.5)),2)
              .where(spi.gt(-1.5).and(spi.lte(-1)),3)
              .where(spi.gt(-1).and(spi.lte(0)),4)
              .where(spi.gt(0),5).clip(AOI)

/*Se crean los parametros de visualizacion para cada una de las clases*/

var color_class = ['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4']
var viz_class = {min:1, max:5, palette: color_class}

// throw('stop')

///////////////////*Calcular el Indice de Humedad del Suelo SMI*////////////

/*Importar la coleccion de imagenes de humedad del suelo del producto
NASA_USDA/HSL/SMAP10KM_soil_moisture, con unidades en fraccion de 0-1 de la 
humedad del suelo y se realiza un filtro por fecha inicial y final del periodo 
de analisis*/

var soil_moisture = ee.ImageCollection('NASA_USDA/HSL/SMAP10KM_soil_moisture')
                  .filterDate(fechaInicio, fechaFinal)

print('Coleccion humedad del suelo', soil_moisture)
                  
/*Seleccionar de la coleccion de imagenes de humedad del suelo la banda smp, calcular
el promedio del valor de humedad del suelo para el periodo establecido y cortar
al poligono del area de trabajo especificada*/                  

var soil_moisture1 = soil_moisture.select('smp').mean().clip(AOI)

print('Humedad del suelo promedio:', soil_moisture1)

/*Se crean los parametros de visualizacion para el indice de humedad del suelo y 
se adiciona al mapa*/

var soilMoistureVis = {
  min: 0,
  max: 1,
  palette: ['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4'],
}

Map.addLayer(soil_moisture1, soilMoistureVis, 'SMI del periodo')

/*Se establecen los parametros de cada clase del indice SMI */

var smiclass = ee.Image(1)
          .where(soil_moisture1.gte(0).and(soil_moisture1.lte(0.2)), 1)
          .where(soil_moisture1.gt(0.2).and(soil_moisture1.lte(0.4)), 2)
          .where(soil_moisture1.gt(0.4).and(soil_moisture1.lte(0.6)), 3)
          .where(soil_moisture1.gt(0.6).and(soil_moisture1.lte(0.8)), 4)
          .where(soil_moisture1.gt(0.8).and(soil_moisture1.lte(1)), 5).clip(AOI)

// throw('stop')

///////////////*Calcular el Indice de Severidad de Sequia de Palmer PDSI*////////////

/*Importar la coleccion de imagenes con el valor del indice PDSI de
IDAHO_EPSCOR/TERRACLIMATE y se realiza un filtro por fecha inicial y final del 
periodo a analizar*/

var dataset = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
                .filterDate(fechaInicio, fechaFinal)
                
print('Coleccion Palmer', dataset)

/*Seleccionar de la coleccion de imagenes la banda pdsi, calcular el promedio 
del valor del indice PSDI para el periodo establecido, cortar por el poligono 
del area de trabajo especificada y ajustar los valores a la escala de 0.01*/ 

var pdsi = dataset.select('pdsi').mean().clip(AOI).multiply(0.01)

/*Se crean los parametros de visualizacion para el indice PDSI y se adiciona al mapa*/

var pdsiVis = {
  min: -10,
  max: 10,
  palette: ['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4'],
}

Map.addLayer(pdsi, pdsiVis, 'PDSI del periodo')

/*Se establecen los parametros de cada clase del indice PDSI */

var pdsiclass = ee.Image(1)
              .where(pdsi.lte(-4), 1)
              .where(pdsi.gt(-4).and(pdsi.lte(-3)),2)
              .where(pdsi.gt(-3).and(pdsi.lte(-2)),3)
              .where(pdsi.gt(-2).and(pdsi.lte(0)),4)
              .where(pdsi.gt(0),5).clip(AOI)

///////////////////*Calcular el Indice de Condicion de Salud Vegetal VHI*////////////

/*Importar la coleccion de imagenes con el valor de la temperatura superficial del suelor
LST de la coleccion MODIS/061/MOD11A2* para el periodo establecido*/

var LST = ee.ImageCollection('MODIS/061/MOD11A2')
          .filterDate(fechaInicio, fechaFinal)

print('Coleccion temperatura superficial del suelo LST', LST)

/*Importar la coleccion de imagenes con el valor del indice de vegetacion NDVI de 
la coleccion MODIS/061/MOD13A1 para el periodo establecido,*/

var NDVI = ee.ImageCollection('MODIS/061/MOD13A1')
          .filterDate(fechaInicio, fechaFinal)

print('Coleccion NDVI', NDVI)

/*Seleccionar de las colecciones de imagenes las bandas NDVI y LST_Day_1km y cortar 
por el poligono del area de trabajo especificada*/

var filterNDVI = NDVI.select('NDVI').filterBounds(AOI)
var filterLST = LST.select('LST_Day_1km').filterBounds(AOI)

/*Se realiza una transformacion del valor del NDVI de cada imagen de la coleccion 
multiplicando el dato correspondiente en 0.0001 para escalarlos datos y manteniendo
el dato de system:index y system:time_start de la coleccion original*/

var scaledNDVI = filterNDVI.map(function(img){
  return img.multiply(0.0001)
  .copyProperties(img,['system:time_start']);
});

/*Se realiza una transformacion del valor del LST de cada imagen de la coleccion 
dividiendo el dato correspondiente en 0.02 para escalar los datos, se realiza 
la conversion de grados K a C° restando 273.15 y manteniendo el dato de 
system:index y system:time_start de la coleccion original*/

var scaledLST = filterLST.map(function(img){
  return img.multiply(0.02).subtract(273.15)
  .copyProperties(img,['system:time_start']);
})

/*Se realiza el calculo de indice VCI para cada imagen de la coleccion, se corta al
area de trabajo, se renombra la banda como VCI y se mantiene el dato del 
system:time_start de la coleccion original y se le da un formato de fecha*/

var VCI = scaledNDVI.map(function(image){
  var Imin = scaledNDVI.reduce(ee.Reducer.min())
  var Imax = scaledNDVI.reduce(ee.Reducer.max())
    return image.expression('(Ia-Imin)/(Imax-Imin)*100',
      {
        Ia: image,
        Imin: Imin,
        Imax: Imax
      }).clip(AOI).rename('VCI')
        .copyProperties(image, ['system:time_start'])
        .set('date', image.date().format('YYYY_MM_dd'))
})

/*Se realiza el calculo de indice TCI para cada imagen de la coleccion, se corta al
area de trabajo, se renombra la banda como TCI y se mantiene el dato del system:time_start
y se le da un formato de fecha*/

var TCI = scaledLST.map(function(image){
  var Imin = scaledLST.reduce(ee.Reducer.min())
  var Imax = scaledLST.reduce(ee.Reducer.max())
    return image.expression('(Imax-Ia)/(Imax-Imin)*100',
      {
        Ia: image,
        Imin: Imin,
        Imax: Imax
      }).clip(AOI).rename('TCI')
        .copyProperties(image, ['system:time_start'])
        .set('date', image.date().format('YYYY_MM_dd'))
})

/*Calcular el valor promedio del indice VCI y TCI y para el area de trabajo */

VCI = VCI.mean().clip(AOI)
TCI = TCI.mean().clip(AOI)

/*Se adiciona la banda TCI a las imagenes de que contienen la banda VCI */

var both = VCI.addBands(TCI)

/*Se calcula el indice VHI */

var VHI = both.expression('(a1+b1)/2', {
          a1: both.select('VCI'),
          b1: both.select('TCI'),
        }).divide(100).rename('VHI').clip(AOI)

/*Se crean los parametros de visualizacion para el indice VHI y se adiciona al mapa*/

var VHIvis = {
  min: 0,
  max: 1,
  palette: ['red','yellow','green'],
}

Map.addLayer(VHI, VHIvis, 'VHI del periodo')

/*Se establecen los parametros de cada clase del indice VHI */

var vhiclass = ee.Image(1)
              .where(VHI.gte(0).and(VHI.lte(0.1)),1)
              .where(VHI.gt(0.1).and(VHI.lte(0.2)),2)
              .where(VHI.gt(0.2).and(VHI.lte(0.3)),3)
              .where(VHI.gt(0.3).and(VHI.lte(0.4)),4)
              .where(VHI.gt(0.4).and(VHI.lte(1)),5).clip(AOI)


///////////////////*Calcular el Indice de Amenaza de Sequia*////////////

/*Calcular el indice de amenaza de sequia y con la funcion toInt se obtine el valor entero*/

var Hazard_index = spiclass.add(smiclass.add(pdsiclass.add(vhiclass))).divide(4).toInt()

/*Se visualiza en el mapa el indice de amenaza de sequia */

Map.addLayer(Hazard_index, viz_class, 'Indice de amenaza de sequia')

/*Se crea la leyenda del Indice de Amenaza de Sequia */

var leyenda = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

var titulo = ui.Label({
  value: 'Indice de Amenaza de Sequia',
  style: {
    fontWeight: 'bold',
    fontSize:  '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

leyenda.add(titulo);

var fila = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  var descripcion = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });
  
  return ui.Panel({
    widgets: [colorBox, descripcion],
    layout: ui.Panel.Layout.Flow('horizontal') 
  });
};

var palette = ee.List(color_class);
var names = ee.List(clases);
  
for (var i = 0; i < 5; i++) {
  var Name = ee.String(names.get(i).getInfo());
  leyenda.add(fila(palette.get(i).getInfo(),Name.getInfo() ));
  } 
Map.add(leyenda);



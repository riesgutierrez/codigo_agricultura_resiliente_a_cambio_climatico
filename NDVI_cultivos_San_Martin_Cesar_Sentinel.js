var predios = ee.FeatureCollection("projects/ee-riesgutierrez/assets/PREDIOS_SAN_MARTIN"),
    palma = /* color: #0b4a8b */ee.Geometry.Point([-73.6160347614287, 7.917987650866555]),
    arroz = /* color: #00ffff */ee.Geometry.Point([-73.5981575440546, 7.872103120747355]),
    cacao = /* color: #bf04c2 */ee.Geometry.Point([-73.43026417774483, 8.05717121307755]);

// Crear un NDVI para cada imagen de una coleccion
// uso de la funcion map(app)
// agregar una banda de NDVI a cada imagen y utilizar una mascara sobre la imagen
// para ver solo los valores de NDVI por encima de 0.5 o por debajo de 0.5
// definir estilo al poligono de corte con color y grosor de borde, fondo transparente
// visualizar en el mapa definiendo unos parametros de valor de NDVI max y min
// y con una paleta de colores de azul, negro, blanco, amarillo, verde y rojo
// visualizacion de indices NDVI 
// graficar los indices de NDVI por cada poligono identificado del archivo shape 
// utilizando la funcion ui.Chart.image para cada una de las imagenes de la coleccion
// para que grafique los poligonos del archivo shape con información de San Martin
// graficar los indices de NDVI por cada poligono identificado del archivo shape 
// a partir de los puntos identificados en el mapa  "arroz", "plama", "cacao"
// utilizando la funcion ui.Chart.image para cada una de las imagenes de la coleccion
// imprimir en la consola

var app = function (image){
  var ndvi = image.normalizedDifference(["B8", "B4"])
  image = image.addBands(ndvi.rename("NDVI"))
  image = image.addBands(ndvi.rename("NDVI_1").mask(ndvi.gte(0.5)))
  // image = image.addBands(ndvi.rename("NDVI").mask(ndvi.lte(0.5)))
  return image.clip(predios)} 
var coleccion = ee.ImageCollection("COPERNICUS/S2")
.filterBounds(predios)
.filterDate("2017-01-01", "2023-12-01")
.filterMetadata("CLOUDY_PIXEL_PERCENTAGE", "less_than", 10)
.map(app)
var poligono = ee.FeatureCollection("projects/ee-riesgutierrez/assets/PREDIOS_SAN_MARTIN").style({color: "orange", width: 1, fillColor: "00000000"})
var visParams = {bands:["NDVI"], min: -0.15, max:0.9, palette: ["blue", "black", "white", "yellow", "green", "red"]}
Map.addLayer(coleccion, visParams, "coleccion")
Map.addLayer(poligono)
Map.centerObject(predios,12)
var grafico_1 = ui.Chart.image.series(coleccion.select("NDVI"), arroz, ee.Reducer.mean(), 10)
var grafico_2 = ui.Chart.image.series(coleccion.select("NDVI"), palma, ee.Reducer.mean(), 10)
var grafico_3 = ui.Chart.image.series(coleccion.select("NDVI"), cacao, ee.Reducer.mean(), 10)
print("graficaNDVI_arroz", grafico_1)
print("graficaNDVI_palma", grafico_2)
print("graficaNDVI_cacao", grafico_3)
print("tabla", predios)
print("coleccion_1", coleccion)


// Continuar con el ejercicio de NDVI pero a partir de un filtro por tamaño 
// de "Hectareas" superior a 400 del shape de predios y para visualizar en
// la consola ambas colecciones la de predios y la del filtro
// apartir de los poligonos filtrados crear una coleccion de imagenes
// con un filtro de las imagenes del 2017 al 2023 y del periodo del 1 de abril
// al 30 de junio en días julianos, con un filtro de nubosidad
// Crear un NDVI para cada imagen de una coleccion
// uso de la funcion map para desarrollar el indice normalizado NDVI
// agregar una banda de NDVI a cada imagen y utilizar una mascara sobre la imagen
// para ver solo los valores de NDVI por encima de 0.5
// que realice esa función del NDVI en cada imagen de la coleccion filtrada
// definir parametros de visualizacion en el mapa para el NDVI de la coleccion filtrada

// var filtro = predios.filter(ee.Filter.gte("Hectareas", 400))
// print("tabla", predios)
// print("filtro", filtro)
// var coleccion = ee.ImageCollection("COPERNICUS/S2")
// .filterBounds(filtro)
// .filter(ee.Filter.calendarRange(2017, 2023, "year"))
// .filter(ee.Filter.calendarRange(91, 181, "day_of_year"))
// .filterMetadata("CLOUDY_PIXEL_PERCENTAGE", "less_than", 15)
// .map(function(image){
//   var ndvi = image.normalizedDifference(["B8", "B4"])
//   image = image.addBands(ndvi.rename("NDVI").mask(ndvi.gte(0.5)))
//   return image.clip(filtro)})
// var visParams = {bands:["NDVI"], min: -0.15, max:0.9, palette: ["blue", "black", "white", "yellow", "green", "red"]}
// Map.addLayer(coleccion, visParams)
// var estilo = filtro.style({color: "orange", width: 1, fillColor: "00000000"})
// var grafico = ui.Chart.image.seriesByRegion(coleccion, filtro, ee.Reducer.mean(), "NDVI", 10, null, "FID_PREDIO")
// Map.addLayer(estilo)
// Map.centerObject(predios,12)
// print(coleccion)
// print(grafico)
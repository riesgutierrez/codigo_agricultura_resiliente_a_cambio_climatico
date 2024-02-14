var predios = ee.FeatureCollection("projects/ee-riesgutierrez/assets/PREDIOS_SAN_MARTIN");

/*El siguiente script crea un mapa de indice de sequia utilizando el Indice de Condicion 
de la Vegetacion VCI, que compara el NDVI de un mes especifico con el rango de valores
del NDVI observados en el mismo mes para una serie de años desde el 2000 a la actualidad,
permitiendo analizar las condiciones del estado de la vegetacion para el periodo a analizar.
Se utiliza una coleccion de imagenes 'MODIS/061/MOD13Q1', para un area correspondiente
al municipio de San Martin - Cesar, presentado en un archivo shapefile con los diferentes
predios del municipio de San Martin - Cesar*/

/*Traer el archivo shapefile correspondiente al area del municipio de San Martin - Cesar y
definir los parametros para su visualizacion para adicionarla y centrarla en el mapa*/

var area = ee.FeatureCollection("projects/ee-riesgutierrez/assets/PREDIOS_SAN_MARTIN")

print(area, "Area San Martin")

var poligono = ee.FeatureCollection("projects/ee-riesgutierrez/assets/PREDIOS_SAN_MARTIN")
        .style({color: "black", width: 1, fillColor: "00000000"});
Map.addLayer(poligono, {}, "Area de estudio")
Map.centerObject(predios, 11)

/*Traer la coleccion de imagenes MODIS/061/MOD13Q1 que contiene los indices de vegetacion NDVI
y EVI a nivel global cada 16 dias con una resolucion de 250m, donde se selecciona la banda del
indice NDVI, se imprime la coleccion para saber el total de imagenes y el contenido de cada
imagen*/

var coleccion = ee.ImageCollection('MODIS/061/MOD13Q1')
            .select('NDVI');

print(coleccion.size(), "Total numero de images NDVI:") 
print("Coleccion imagenes:", coleccion)

/*Se realiza una transformacion del valor del NDVI de cada imagen de la coleccion dividiendo
el dato correspondiente en 10000 y manteniendo el dato de system:index y system:time_start de
la coleccion original*/

var modisScaled = coleccion.map(function(image) {
  var scaled = image.divide(10000)
  return scaled.copyProperties(image, ['system:index', 'system:time_start'])
});

/*Se establece el año y el mes que se quiere analizar que se encuentre dentro de la coleccion
de imagenes*/

var year = 2016
var month = 02;

/*Se establece la serie de imagenes con el valor del NDVI para el mismo mes especificado dentro
de la coleccion de imagenes de MODIS ajustada*/

var ndvi = modisScaled.filter(ee.Filter.calendarRange(month,month,'month'));
print (ndvi, "Serie NDVI  para el mes especifico:")

/*Se establece el valor maximo y minimo del indice NDVI para la serie de datos que corresponde
con el mismo mes que se establecio dentro de la coleccion de imagenes para el area de trabajo
correspondiente al municipio de San Martin - Cesar*/

var ndvi_max = ndvi.max().clip(area);
var ndvi_min = ndvi.min().clip(area);

/*Se definen los parametro para la visualizacion del indice NDVI y se adicionan al mapa la
visualizacion del NDVI maximo y minimo*/

var parametrosndvi = {min:-0.25, max:0.9, palette: ['blue', 'black', 'white', 'yellow', 'green', 'red']}
Map.addLayer(ndvi_max, parametrosndvi, 'NDVI_max', 0);
Map.addLayer(ndvi_min, parametrosndvi, 'NDVI_min', 0);

/*Se define el valor del NDVI para el mes y año especificados y se establece el valor promedio
para el mes en el area de trabajo correspondiente al municipio de San Martin - Cesar*/

var ndviT = modisScaled.filter(ee.Filter.calendarRange(year,year,'year'))
    .filter(ee.Filter.calendarRange(month,month,'month'))
    .median()
    .clip(area);

/*Se visualiza en el mapa el indice NDVI del mes y año establecidos*/

Map.addLayer(ndviT, parametrosndvi, 'NDVI mes/año especificado', 0);

/*Se calcula el valor del Indice de Condicion de la Vegetacion VCI, se crea una imagen
para el mes y año especificado con la banda VCI y se imprime en la consola*/

var VCI = ndviT.subtract(ndvi_min).divide(ndvi_max.subtract(ndvi_min)).rename('VCI');

print (VCI, "VCI mes/año especificado")

/*Se establecen los parametro para la visualizacion del indice VCI y se visualiza en el mapa*/

var visparam = {
  bands:['VCI'], 
  min: 0.0010, 
  max: 0.9790,
  opacity: 1,
  palette: ["ff3510","ebff10","20ff18","1afff2","1629ff"]
}
Map.addLayer(VCI, visparam, 'VCI mes/año especificado', 1)

/*Se establece una funcion para el calculo del VCI de las diferentes imagenes de la coleccion y se
crea una banda VCI para cada imagen, se imprime la coleccion de imagenes con el VCI en la consola
y se visualiza en el mapa*/

var VCIfunc = function(img){
    img = img.clip(area)
    var date = ee.Date(img.get('system:time_start'));
    var month = date.get('month');
    var dataset2 = modisScaled.filter(ee.Filter.calendarRange(month,month,'month'));
    var NDVImin =  dataset2.min();
    var NDVImax =  dataset2.max();
    var VCI = img.subtract(NDVImin).divide(NDVImax.subtract(NDVImin)).rename('VCI')
                  .copyProperties(img, ['system:time_start']);
    return VCI    
  }
  
var modVCI = modisScaled.map(VCIfunc)

print (modVCI, "Coleccion imagenes VCI:")
Map.addLayer (modVCI, visparam, 'VCI coleccion', 1)

/*Se crea una variable con las clases del valor del VCI*/

var clases = ['Extremadamente seco: 0.0 - 0.1',
              'Severamente seco: 0.1 - 0.2',
              'Moderadamente seco: 0.2 - 0.3',
              'Levemente seco: 0.3 - 0.4',
              'Sin sequia: 0.4 - 1.0']
              
/*Se crea una variable con la paleta de colores correspondiente para cada clase del valor del VCI*/

var color_clases = ["ff3510","ebff10","20ff18","1afff2","1629ff"]

/*Se crea una paleta con la informacion del Indice de Sequia que contiene los colores y la descripcion
de cada una de las clases de los valores del indice VCI*/

var leyenda = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

var titulo = ui.Label({
  value: 'Indice de Sequia - VCI',
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

var palette = ee.List(color_clases);
var names = ee.List(clases);
  
for (var i = 0; i < 5; i++) {
  var Name = ee.String(names.get(i).getInfo());
  leyenda.add(fila(palette.get(i).getInfo(),Name.getInfo() ));
  } 
Map.add(leyenda);


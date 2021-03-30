var dept_id = '6147'
var dept_ids = [];
var dates = [];
var anom_data = [];
var map_data = [];
var timeseries_data = [];
var selData = "IMERG";
var selDept = "Carlos Casares";		
var viewopt = 'sat';
var colormap = [[0,151,92],[113,185,117],[192,217,150],[255,252,193],[252,195,119],[249,130,63],[238,40,32]];
var colorscale = [100, 80, 60, 40, 20, 0, -20, -40, -60, -80, -100];
var DateLabels = [];


Chart.defaults.global.defaultFontSize = 18;


$('document').ready(function(){ 
			
setActiveData(document.getElementById("IMERG")); 

});


function setActiveData(clicked, opt){
    selData = clicked.innerHTML;
    if (opt == 'crop') {
        loadData('crops/' + clicked.id + '_loss.csv');	
    } else {
        selData = clicked.innerHTML;
        loadData('sat/' + clicked.id + '_avg.csv');	
    }
}

function loadData(fname) {
	csvData = $.ajax({
		type: "GET",
		url: "https://mdmaas.github.io/Obsat-Agromet/data/" + fname,
		dataType: "text",
		success: 
            function (result) {
              // Parse CSV, dates and dept_ids
              anom_data = $.csv.toArrays(result);
              dates = anom_data[0];
              for (i = 1; i < anom_data.length; i++) {
                  dept_ids[i-1] = anom_data[i][0];
              }
              // Select map and time series data
              newDate = document.getElementById('seldate').value;
              if ( dates.indexOf(newDate) > 0 ){
                  date_ind = dates.indexOf(newDate);
              } else {
                  date_ind = dates.length-2;
              }
              loadMapData(date_ind);
              setDateLabels();
              loadTimeSeries(dept_id);
              info.update();
             },	
		error: function (request, status, error) {
			alert('Datos no disponibles');
		}				 			 
	});
	

};

function loadTimeSeries(dept_id){
	ind = dept_ids.indexOf(dept_id.toString());	
	for (i = 0; i < DateLabels.length; i++) {
		index_date = dates.indexOf(DateLabels[i]);
		timeseries_data[i] = anom_data[ind+1][index_date];
	}
	updateConfigByMutating(mychart);
};

function loadMapData(date_ind){
	for (i = 1; i < anom_data.length; i++) {
	  map_data[i-1] = anom_data[i][date_ind];
	}
	geojson.resetStyle();	
};

function changeDate( newDate ){
	loadMapData(dates.indexOf(newDate)); 
	setDateLabels();
	loadTimeSeries(dept_id);
	updateConfigByMutating(mychart);
}

var mymap = L.map('mapid', 
            {
				center: [-37, -62.0],
				crs: L.CRS.EPSG3857,
				zoom: 5,
				zoomControl: false,
				preferCanvas: false,
			}
);
   
L.tileLayer('http://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png', {
	opacity: 1.0,
	attribution: "\u003ca href=\"https://mdmaas.github.io/Obsat-Agromet/\"\u003e Observatorio Satelital Agrometeorológico \u003c/a\u003e",
	minZoom: 1,
	maxZoom: 28,
	minNativeZoom: 0,
	maxNativeZoom: 18
}).addTo(mymap);

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}).join('')

function getOpacity(d) {
    return (d<-999 ? 0 : 0.9);
}
	
function getColor(d) {
    // Normalize input in (a,b)
    a = colorscale[colorscale.length-1]
    b = colorscale[0];
    ab_center = (b+a)/2.0;
    ab_halflength = (b-a)/2.0;
    dcap = (Math.abs(d-ab_center) < ab_halflength ? d : Math.sign(d-ab_center)*ab_halflength+ab_center);

    // Interpolate colorscale
	dd = (b-dcap)/(b-a)*6;
	ca = Math.floor(dd);
	cb = Math.ceil(dd);
	lam = dd - ca;
	r = colormap[cb][0] * lam + colormap[ca][0] * (1-lam);
	g = colormap[cb][1] * lam + colormap[ca][1] * (1-lam);
	b = colormap[cb][2] * lam + colormap[ca][2] * (1-lam);
	return rgbToHex(Math.floor(r),Math.floor(g),Math.floor(b));
}

function style(feature) {
	return {
		fillColor: getColor( getDensity(feature.properties.in1) ),
		weight: 1,
		opacity: 1,
		color: 'white',
		dashArray: '3',
		fillOpacity: getOpacity( getDensity(feature.properties.in1) )
	};
}	
    
// Custom Info and Legend controls

L.control.zoom({
    position: 'topright'
}).addTo(mymap); 
		
var info = L.control({position: 'topleft'});

info.onAdd = function (map) {
	this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
	this.update();
	return this._div;
};

info.update = function (props) {
	this._div.innerHTML = '<h4>Visualizando ' + selData + '</h4>' +  (props ?
		'<b>' + props.nam + '. ' + getDensity(props.in1) + '</b>'
		: 'Seleccione departamento');
};
info.addTo(mymap);  
 
// Search Box "Enter key" listener 
var input = document.getElementById("searchdept");
input.addEventListener("keyup", function(event) {
      if (event.keyCode === 13) {
       event.preventDefault();
       document.getElementById("searchbtn").click();
      }
    });


var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
	var div = L.DomUtil.create('div', 'info legend'), labels = [];
	// Generate a label with a colored square for each colorscale interval
	div.innerHTML += '<center><b>Desviación Histórica</b></center>' + '<ul>'
	for (var i = 0; i < colorscale.length; i++) {
		div.innerHTML += '<li><i style="background:' + getColor(colorscale[i]) + '"></i> ' + 
        (colorscale[i]>0 ? '+' + colorscale[i] :colorscale[i]) + '%</li>';
	}
	div.innerHTML += '</ul>'
	return div;
};
legend.addTo(mymap);     


// Mouse Events
function highlightFeature(e) {
	var layer = e.target;

	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7
	});

	if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
		layer.bringToFront();
	}
	
	info.update(layer.feature.properties);
}

function resetHighlight(e) {
	geojson.resetStyle(e.target);
	info.update();
}            

function zoomToFeature(e) {
	mymap.fitBounds(e.target.getBounds());
}

function selectDepartment(e) {
	selDept = e.target.properties.nam;
	dept_id = e.target.properties.in1
	loadTimeSeries(dept_id);		
	updateConfigByMutating(mychart);
}

		
function onEachFeature(feature, layer) {
	layer.properties = feature.properties;
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: selectDepartment
	});
}          

// Add map
geojson = L.geoJSON(myGeoDeptos, {
	style: style,
	onEachFeature: onEachFeature
	}).addTo(mymap);

function getDensity ( in1 ){
	value = map_data[dept_ids.indexOf(in1.toString())];
	if (typeof value !== 'undefined') {
		return value;
	} else {
		return 0;
	}
	
};

// Chart.js

const ctx = document.getElementById('timeSeriesChart').getContext('2d');

var mychart = new Chart(ctx, {
  type: 'line',
  data: {
	labels: DateLabels,
	datasets: [{
	  label: selDept,
	  data: timeseries_data,
	  borderWidth: 2,
	  fill: false,
	  backgroundColor: '#000080',
	  borderColor: '#000080'
	}]
  },
  options: {
	  title: {
		  display: true,
		  text: selData + ' ' + selDept
		  },
      legend: {
            position: "bottom",
            align: "middle",
            display: false
          },
	  scales: {
		  		xAxes: [{
				display: true,
				scaleLabel: {
					display: false,
					labelString: 'Mes'
					}
				}],
		  		yAxes: [{
				display: true,
				scaleLabel: {
					display: false,
					labelString: 'Percentil'
					}
				}]
	  }	  
  }
});

function updateConfigByMutating(chart) {
	chart.options.title.text = selData + ', ' + selDept;
	chart.data.datasets[0].data = timeseries_data;
	chart.data.datasets[0].label = selDept;
	chart.data.labels = DateLabels;
	chart.update();
};

function setDateLabels() {
	var newDate = document.getElementById('seldate').value;
	var ind_date = dates.indexOf(newDate);
    var np = document.getElementById('numperiods').value;
	DateLabels = dates.slice(ind_date-(np-1),ind_date+1);
};

function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha," + selData + ' ' + selDept + "\n";
    for (var i = 0; i < DateLabels.length; i++) {
      csvContent += DateLabels[i] + "," + timeseries_data[i] + "\n";
    }

    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", selDept + ".csv");
    document.body.appendChild(link);
    link.click();
};

function search(){
    var input_text = document.getElementById("searchdept").value;
    alert(input_text);
};


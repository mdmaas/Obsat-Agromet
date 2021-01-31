var dept_id = '6147'
var dept_ids = [];
var dates = [];
var anom_data = [];
var map_data = [];
var timeseries_data = [];
var selData = "Anomalía de IMERG";
var selDept = "Carlos Casares";		



$('document').ready(function(){ 
			
setActiveData(document.getElementById("IMERG")); 

});


		
function setActiveData(clicked){
	selData = clicked.innerHTML;
	loadData(clicked.id + '_avg.csv');	
}

function loadData(fname) {
	
	csvData = $.ajax({
		type: "GET",
		url: "https://mdmaas.github.io/OSEE/data/" + fname,
		dataType: "text",
		success: function (result) {
		  // Parse CSV, dates and dept_ids
		  anom_data = $.csv.toArrays(result);
		  dates = anom_data[0].slice(2,-1);
		  for (i = 1; i < anom_data.length; i++) {
			  dept_ids[i-1] = anom_data[i][1];
		  }
		  
		  // Select map and time series data
		  loadTimeSeries('6147');
		  dateStr = document.getElementById('seldate').value;
		  loadMapData(dateStr);
		  info.update();
		 },	
		error: function (request, status, error) {
			alert(request.responseText);
			alert(status);
			alert(error);
		}				 			 
	});
	

};

function loadTimeSeries(dept_id){
	ind = dept_ids.indexOf(dept_id.toString());
	for (i = 0; i < DateLabels.length; i++) {
		index_date = dates.indexOf(DateLabels[i]);
		timeseries_data[i] = anom_data[ind+1][index_date+2];
	}
	updateConfigByMutating(mychart);
};

function loadMapData(date){
	ind = dates.indexOf(date);
	for (i = 1; i < anom_data.length; i++) {
	  map_data[i-1] = anom_data[i][ind+2];
	}
	geojson.resetStyle();	
};

function changeDate( newDate ){
	loadMapData(newDate); 
	setDateLabels();
	loadTimeSeries(dept_id);
	updateConfigByMutating(mychart);
}

var mymap = L.map('mapid', 
            {
				center: [-37, -62.0],
				crs: L.CRS.EPSG3857,
				zoom: 5,
				zoomControl: true,
				preferCanvas: false,
			}
);
    
L.tileLayer('http://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png', {
	opacity: 1.0,
	attribution: "Mapabase del \u003ca href=\"http://www.ign.gob.ar\"\u003eInstituto Geografico Nacional\u003c/a\u003e",
	minZoom: 1,
	maxZoom: 28,
	minNativeZoom: 0,
	maxNativeZoom: 18
}).addTo(mymap);

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}).join('')

var colormap = [[0,151,92],[113,185,117],[192,217,150],[255,252,193],[252,195,119],[249,130,63],[238,40,32]];
	
function getColor(d) {
	dcap = (Math.abs(d) < 1 ? d : Math.sign(d));
	dd = -dcap*3+3;
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
		fillOpacity: 0.9
	};
}	
    
// Custom Info Control
		
var info = L.control();

info.onAdd = function (map) {
	this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
	this.update();
	return this._div;
};

info.update = function (props) {
	this._div.innerHTML = '<h4>' + ' Anomalía de ' + selData + '</h4>' +  (props ?
		'<b>' + props.nam + ': ' + getDensity(props.in1) + '</b><br />'
		: 'Seleccione Departamento');
};

info.addTo(mymap);     

// Custom Legend Control

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

	var div = L.DomUtil.create('div', 'info legend'),
		grades = [1, 0.75, 0.5, 0.25, 0, -0.25, -0.5, -0.75, -1],
		labels = [];

	// loop through our density intervals and generate a label with a colored square for each interval
	div.innerHTML += '<center><b>Percentil Histórico</b></center>' + '<ul>'
	for (var i = 0; i < grades.length; i++) {
		div.innerHTML += '<li><i style="background:' + getColor(grades[i]) + '"></i> ' + 
						 grades[i]*100 + '%</li>';
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

const ctx = document.getElementById('timeSeriesChart').getContext('2d');

var DateLabels = [];
setDateLabels();

Chart.defaults.global.defaultFontSize = 18;

var mychart = new Chart(ctx, {
  type: 'line',
  data: {
	labels: DateLabels,
	datasets: [{
	  label: selData,
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
		  text: selDept
		  },
	  scales: {
		  		xAxes: [{
				display: true,
				scaleLabel: {
					display: true,
					labelString: 'Mes'
					}
				}],
		  		yAxes: [{
				display: true,
				scaleLabel: {
					display: true,
					labelString: 'Percentil'
					}
				}]
	  }	  
  }
});

function updateConfigByMutating(chart) {
	chart.options.title.text = selDept + ' in1: ' + dept_id;
	chart.data.datasets[0].data = timeseries_data;
	chart.data.datasets[0].label = 'Anomalía de ' + selData;
	chart.data.labels = DateLabels;
	chart.update();
};

function setDateLabels() {
	var selDateStr = document.getElementById('seldate').value;
	var selYear = selDateStr.substring(0,4)
	var selMonth = selDateStr.substring(5,7)
	var startDate = new Date(selYear,selMonth,0)
	startDate = moment(startDate).subtract(11, 'months');
	DateLabels = [];
	for (i = 0; i < 12; i++) {
	  date = moment(startDate).add(i, 'months').format('YYYY-MM');
	  DateLabels.push(date.toString());
	}
	
};

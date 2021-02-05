var dept_id = '6147'
var dept_ids = [];
var dates = [];
var anom_data = [];
var map_data = [];
var timeseries_data = [];
var selData = "Percentiles de IMERG";
var selDept = "Carlos Casares";		
var viewopt = 'sat';
var colormap = [[0,151,92],[113,185,117],[192,217,150],[255,252,193],[252,195,119],[249,130,63],[238,40,32]];
var colorscale = [100, 80, 60, 40, 20, 0, -20, -40, -60, -80, -100];
var DateLabels = [];


Chart.defaults.global.defaultFontSize = 18;


$('document').ready(function(){ 
			
setActiveData(document.getElementById("IMERG")); 
setDateLabels();

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
		url: "https://mdmaas.github.io/OSEE/data/" + fname,
		dataType: "text",
		success: 
            function (result) {
              // Parse CSV, dates and dept_ids
              anom_data = $.csv.toArrays(result);
              dates = anom_data[0].slice(1);
              for (i = 1; i < anom_data.length; i++) {
                  dept_ids[i-1] = anom_data[i][0];
              }
              // Select map and time series data
              loadTimeSeries('6147');
              //~ var dateStr = document.getElementById('seldate').value;
              loadMapData(dates.length-1);
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
		timeseries_data[i] = anom_data[ind+1][index_date+2];
	}
	updateConfigByMutating(mychart);
};

function loadMapData(ind){
	for (i = 1; i < anom_data.length; i++) {
	  map_data[i-1] = anom_data[i][ind];
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
    position: 'topleft'
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

var datepick = L.control({position: 'topleft'});
datepick.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info'),labels = [];
    div.innerHTML = '<input type="month" id="seldate" name="seldate" onchange="changeDate(this.value);" min="2000-01" max="2021-1" value="2018-02">';
    return div;
}
datepick.addTo(mymap);

var menu = L.control({position: 'topright'});
menu.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info'),labels = [];
    div.innerHTML = `
    <div class="menu-container">
			<nav id="app-menu" role="navigation">  
			<ul>
				<li>
					<a href="#">Cobertura Vegetal</a>
					<ul class="second-level">
						<li>
							<a href="#" id="NDVI" onclick="setActiveData(this)">NDVI</a>
						</li>
					</ul>
				</li>
				
				<li>
					<a href="#">Humedad del suelo</a>
					<ul class="second-level">
						<li><a href="#" id="SMAPL3" onclick="setActiveData(this)">SMAP L3</a></li>
						<li><a href="#" id="SMAPL4" onclick="setActiveData(this)">SMAP L4</a></li>
						<li><a href="#" id="GLDAS" onclick="setActiveData(this)">GLDAS</a></li>
						<li><a href="#" id="ESACCI_active" onclick="setActiveData(this)">ESACCI-A</a></li>
						<li><a href="#" id="ESACCI_passive" onclick="setActiveData(this)">ESACCI-P</a></li>
						<li><a href="#" id="ESACCI_combined" onclick="setActiveData(this)">ESACCI-C</a></li>
					</ul>							
				</li>					
				
				<li><a href="#">Lluvias</a>
					<ul class="second-level">
						<li><a href="#" id="IMERG" onclick="setActiveData(this)">IMERG</a></li>
						<li><a href="#" id="CHIRPS" onclick="setActiveData(this)">CHIRPS</a></li>
					</ul>
				</li> 
                                
				<li><a href="#">Pérdida de Rindes</a>
                <ul class="second-level">
                    <li><a href="#" id="Soja1ra" onclick="setActiveData(this,'crop')">Soja 1ra</a></li>
                    <li><a href="#" id="Soja2da" onclick="setActiveData(this,'crop')">Soja 2da</a></li>
                    <li><a href="#" id="Sojatotal" onclick="setActiveData(this,'crop')">Soja total</a></li>
                    <li><a href="#" id="Maiz" onclick="setActiveData(this,'crop')">Maiz</a></li>
                    <li><a href="#" id="Trigocandeal" onclick="setActiveData(this,'crop')">Trigo Candeal</a></li>
                    <li><a href="#" id="Trigototal" onclick="setActiveData(this,'crop')">Trigo total</a></li>
                </ul>
                </li>
                
                <li><a href="#">Algoritmos sequía</a>
                <ul class="second-level">
                    <li><a href="#" id="Soja1ra" onclick="setActiveData(this,'sat')">Consenso ponderado</a></li>
                </ul>
                </li>                
                
			</ul>
			</nav>
		  </div>		
    `;
    return div;
}
menu.addTo(mymap);


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

var timeseries = L.control({position: 'topleft'});
timeseries.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info'),labels = [];
    div.innerHTML = '<canvas id="timeSeriesChart" height=200 width=600></canvas>';
    return div;
}
timeseries.addTo(mymap);  



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

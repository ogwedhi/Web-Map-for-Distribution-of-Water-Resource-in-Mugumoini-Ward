var mapView = new ol.View ({
    center: ol.proj.fromLonLat([36.788,-1.324]),
    zoom: 14,
});

var map = new ol.Map ({
    target: 'map',
    view: mapView,
    controls: []
});

var osmTile = new ol.layer.Tile ({
    title: 'Open Street Map',
    visible: true,
    source: new ol.source.OSM()
});

map.addLayer(osmTile);

//adding layers from geoserver

var estates_ = new ol.layer.Tile({
    title: "estates_",
    source: new ol.source.TileWMS({
        url: "http://localhost:8080/geoserver/WEBMAP/wms",
        params: {'LAYERS': 'WEBMAP:estates_', 'TILED' : true},
        serverType: 'geoserver',
        visible: true
    })
});

map.addLayer(estates_)


var otherboreholes = new ol.layer.Tile({
    title: "otherboreholes",
    source: new ol.source.TileWMS({
        url: "http://localhost:8080/geoserver/WEBMAP/wms",
        params: {'LAYERS': 'WEBMAP:other_boreholesshp_xytabletopoint', 'TILED' : true},
        serverType: 'geoserver',
        visible: true
    })
});

map.addLayer(otherboreholes);


//adding layer switcher to toggle layers
var layerswitcher = new ol.control.LayerSwitcher();
map.addControl(layerswitcher);

var mousePosition = new ol.control.MousePosition({
    className: 'mousePosition',
    projection: 'EPSG;4326',
    coordinateFormat: function(coordinate){return ol.coordinate.format(coordinate, '{x} , {y}', 6);}
});
map.addControl(mousePosition);

var container = document.getElementById('popup')
var content = document.getElementById('popup-content')
var closer = document.getElementById('popup-closer')

var popup = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250,
    
    },
    
});
    
map.addOverlay(popup);
    
closer.onclick = function(){
    popup.setPosition(undefined);
    closer.blur();
    return false;
};

// start : home control

var homeButton = document.createElement('button')
homeButton.innerHTML = 'Home';
homeButton.className = 'myButton';

var homeElement = document.createElement('div');
homeElement.className = 'homeButtonDiv';
homeElement.appendChild(homeButton);

var homeControl = new ol.control.Control({
    element: homeElement
})

homeButton.addEventListener("click",() =>{
    location.href = "index.html";
})

map.addControl(homeControl);

// end:home Control



// start : attribute query

var geojson;
var featureOverlay;

var qryButton = document.createElement('button');
qryButton.innerHTML = 'Attribute Query';
qryButton.className = '';
qryButton.id = 'qryButton';

var qryElement = document.createElement('div');
qryElement.className = 'myButtonDiv';
qryElement.appendChild(qryButton);

var qryControl = new ol.control.Control({
    element: qryElement

}) 

var qryFlag =  false;
qryButton.addEventListener("click", () => {
    // disableOther Interaction('lengthButton');
    qryButton.classList.toggle('clicked');
    qryFlag = !qryFlag;
    document.getElementById("map").style.cursor = "default";
    if (qryFlag) {
        if (geojson) {
            geojson.getSource().clear(); 
            map.removeLayer(geojson);
        }

        if (featureOverlay) {
        featureOverlay.getSource().clear();
        map.removeLayer(featureOverlay);
        }
        document.getElementById("attQueryDiv").style.display = "block";

        bolIdentify = false;

        addMapLayerList();
    } else { 
        document.getElementById("attQueryDiv").style.display ="none";
        document.getElementById("attListDiv").style.display = "none";

        if (geojson){
            geojson.getSource().clear();
            map.removeLayer(geojson);
        }

        if (featureOverlay) {
            featureOverlay.getSource().clear();
            map.removeLayer(featureOverlay);
        }
    }

})

map.addControl(qryControl);

//layers
function addMapLayerList(){
    $(document).ready(function () {
        $.ajax({
            type: "GET",
            url: "http://localhost:8080/geoserver/wfs?request=getcapabilities",
            dataType: "xml",
            success: function (xml) {
                var select = $('#selectLayer');
                select.append("<option class = 'ddindent' value=''></option>");
                $(xml).find('FeatureType').each(function () {
                    $(this).find('Name').each(function () {
                        var value = $(this).text();
                        select.append("<option class='ddindent' value= '" + value + "'>" + value + "</option");
                    });
                });
            }
        });
    });
};
//attributes
$(function () {
    document.getElementById("selectLayer").onchange = function () {
        var select = document.getElementById("selectAttribute");
        while (select.options.length > 0) {
            select.remove(0);
        }
        //fetching all attributes
        var value_layer = $(this).val();
        $(document).ready(function () {
            $.ajax({
                type: "GET",
                url: "http://localhost:8080/geoserver/WEBMAP/wfs?request=DescribeFeatureType&typename=" + value_layer,
                dataType: "xml",
                success: function (xml) {
                    var select = $('#selectAttribute');
                    select.append("<option class='ddindent' value=''></option>");
                    $(xml).find('xsd\\:element').each(function () {
                            var value = $(this).attr('name');
                            var type = $(this).attr('type');
                            if (value != 'geom' && value != 'the_geom') {
                                select.append("<option class= 'ddindent' value='"+ type + "'>" + value + "</option> ");
                            }
                    });
                }
            });
        });
    }
    document.getElementById("selectAttribute").onchange = function () {
        var operator = document.getElementById("selectOperator");
        while (operator.options.length > 0) {
            operator.remove(0);
        }

        var value_type = $(this).val();
        //alert(value_type);
        var value_attribute = $('#selectAttribute option:selected').text();
        operator.options[0] = new Option('Select operator', "");

        if (value_type == 'xsd:short' || value_type == 'xsd:int' || value_type == 'xsd:double') {
            var operator1 = document.getElementById("selectOperator");  
            operator1.options[1] = new Option('Greater than','>');
            operator1.options[2] = new Option('Less than','<');
            operator1.options[3] = new Option('Equal to', '=');
        }
        else if (value_type == 'xsd:string') {
            var operator1 = document.getElementById("selectOperator");
            operator1.options[1] = new Option('Equal to', '=');
            operator1.options[2] = new Option('Like','Like');
        }
    }

    document.getElementById('attQryRun').onclick = function () {
        map.set("isLoading", 'YES');
      
        if (featureOverlay) {
            featureOverlay.getSource().clear();
            map.removeLayer(featureOverlay);
        }
      
        var layer = document.getElementById("selectLayer");
        var attribute = document.getElementById("selectAttribute");
        var operator = document.getElementById("selectOperator");
        var txt = document.getElementById("enterValue");
      
        if (layer.options.selectedIndex == 0) {
            alert("Select Layer");
        } else if (attribute.options.selectedIndex == -1) {
            alert("Select Attribute");
        } else if (operator.options.selectedIndex <= 0) {
            alert("Select Operator");
        } else if (txt.value.length <= 0){
            alert("Enter Value");
        } else {
            var value_layer = layer.options[layer.selectedIndex].value;
            var value_attribute = attribute.options[attribute.selectedIndex].text;
            var value_operator = operator.options[operator.selectedIndex].value;
            var value_txt = txt.value;
            if (value_operator == 'Like') {
                value_txt = "%25" + value_txt + "%25";
            }
            else {
                value_txt = value_txt;
            }
            var url = "http://localhost:8080/geoserver/WEBMAP/ows?service=WFS&version=1.0.0&request=GetFeature&typename=" + value_layer + "&CQL_FILTER=" + value_attribute + "+" + value_operator +  "+'" + value_txt + "'&outputFormat=application/json"
            //console.log(url);
            newaddGeoJsonToMap(url);
            newpopulateQueryTable(url);
            setTimeout(function () { newaddRowhandlers(url); }, 300);
            map.set("isLoading", 'NO');
        }
      }      
});

function newaddGeoJsonToMap(url) {

    if(geojson) {
        geojson.getSource().clear();
        map.removeLayer(geojson);
    }

    var style = new ol.style.Style({
        //fill: new ol.style.Fill({
        // color: 'rgba(0, 255, 255, 0.7)    
        // }),
        stroke: new ol.style.Stroke({
            color: '#FFFF00',
            width: 5
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#FFFF00'
            })
        })
    });

    geojson = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: url,
            format: new ol.format.GeoJSON()
        }),
        style: style,

    });

    geojson.getSource().on('addfeature', function () {
        map.getView().fit(
            geojson.getSource().getExtent(),
            { duration: 1590, size: map.getSize(), maxZoom: 21 } 
        )
    })
    map.addLayer(geojson);
};


function newpopulateQueryTable(url) {
    if (typeof attributePanel !== 'undefined') {
        if (attributePanel.parentElement !== null) {
            attributePanel.close();
        }
    }
    $.getJSON(url, function (data) {
        var col = ['id'];
        for (var i = 0; i < data.features.length; i++) {
            for (var key in data.features[i].properties) {
                if (col.indexOf(key) === -1) {
                    col.push(key);
                }
            }
        }

        var table = document.createElement("table");
        table.setAttribute("class", "table-bordered table-hover table-condensed");
        table.setAttribute("id", "attQryTable");
        //create html table

        var tr = table.insertRow(-1); 
        for (var i = 0; i < col.length; i++) {
            var th = document.createElement("th");
            th.innerHTML = col[i];
            tr.appendChild(th);
        }

        // add data as rows
        for (var i = 0; i < data.features.length; i++) {
            tr = table.insertRow(-1);
            for (var j = 0; j < col.length; j++) {
                var tabCell = tr.insertCell(-1);
                if (j == 0) { tabCell.innerHTML = data.features[i]['id']; }
                else {
                    tabCell.innerHTML = data.features[i].properties[col[j]];  
                }
            }
        }

        var tabDiv = document.getElementById('attListDiv');
        var delTab = document.getElementById('attQryTable');
        if (delTab) {
            tabDiv.removeChild(delTab);
        }
        tabDiv.appendChild(table);
        document.getElementById("attListDiv").style.display ="block";

    });

    var highlightStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255,0,255,0.3)',
        }),

        stroke: new ol.style.Stroke({
            color: '#FFOOFF',
            width: 3,
        }),
        
        image: new ol.style.Circle({
            radius: 10,
            fill: new ol.style.Fill({
                color: '#FFOOFF'
            })
        })
    });
    
    var featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector(),
        map: map,
        style: highlightStyle
    });
};  

function newaddRowhandlers() {
    var table = document.getElementById("attQryTable");
    var rows = document.getElementById("attQryTable").rows;
    var heads = table.getElementsByTagName('th');
    var col_no;
    for (var i = 0; i < heads.length; i++) {
        var head = heads[i];
        if (head.innerHTML == 'id') {
            col_no = i + 1;
        }
    }
    for (var i = 0; i < rows.length; i++) {
        rows[i].onclick = function (index) {
            return function () {
                featureOverlay.getSource().clear();

                $(function () {
                    $("#attQryTable td").each(function () {
                        $(this).parent("tr").css("background-color", "white");
                    });
                });

                var cell = this.cells[col_no - 1];
                var id =cell.innerHTML;

                $(document).ready(function () {
                    $("#attQryTable td:nth-child(" + col_no + ")").each(function () {
                        if ($(this).text() == id) {
                            $(this).parent("tr").css("background-color", "#d1d8e2");
                        }
                    });
                });

                var features = geojson.getSource().getFeatures();

                for(i = 0; i < features.length; i++) {
                    if (features[i].getId() == id) {
                        featureOverlay.getSource().addFeature(features[i]);

                        featureOverlay.getSource().on('addfeature', function () {
                            map.getView().fit(
                                featureOverlay.getSource().getExtent(),
                                { duration: 1500, size: map.getSize(), maxZoom: 24}                             
                            );
                        });
                    }
                }
            }
        }(rows[i]);
    }
}
//end of attribute query
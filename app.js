(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const MALDIVES = [4.18469, 73.47953];
  const STORAGE_KEY = "marine-nav-v1";
  const state = { position:null, heading:null, cog:null, speed:0, accuracy:null, watchId:null, trackOn:false, track:[], waypoints:[], routeOn:false, routePoints:[], trackLine:null, routeLine:null, boatMarker:null, wpLayer:null };
  const saved = (()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch(_){return {}}})();
  state.waypoints = Array.isArray(saved.waypoints) ? saved.waypoints : [];
  state.track = Array.isArray(saved.track) ? saved.track : [];
  state.routePoints = Array.isArray(saved.routePoints) ? saved.routePoints : [];

  const map = L.map("map", {zoomControl:false, attributionControl:true}).setView(MALDIVES, 12);
  L.control.zoom({position:"bottomleft"}).addTo(map);
  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom:19, attribution:'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
  });
  const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
  });
  // OpenSeaMap supplies seamark symbols, not bathymetry/depth contours.
  const seamarks = L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
    maxZoom:18, opacity:0.95, attribution:'Seamarks &copy; OpenSeaMap contributors'
  });
  satellite.addTo(map); seamarks.addTo(map);
  state.wpLayer = L.layerGroup().addTo(map);
  state.trackLine = L.polyline([], {color:"#55d8e9",weight:3,opacity:.9}).addTo(map);
  state.routeLine = L.polyline([], {color:"#b77aff",weight:3,dashArray:"7 7",opacity:.95}).addTo(map);

  function persist(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({waypoints:state.waypoints,track:state.track,routePoints:state.routePoints}));}
    catch(_){toast("Storage is full; export your track to keep it.");}
  }
  let toastTimer;
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
  const fmt=(n,d=6)=>Number.isFinite(n)?n.toFixed(d):"--";
  function setGpsStatus(msg,good=false){$("gpsStatus").textContent=msg;$("gpsDot").classList.toggle("good",good);}
  function updatePosition(pos){
    const c=[pos.coords.latitude,pos.coords.longitude];
    state.position=c;state.accuracy=pos.coords.accuracy;
    const rawSpeed=pos.coords.speed;
    state.speed=Number.isFinite(rawSpeed)&&rawSpeed>=0?rawSpeed*1.943844:0;
    const h=pos.coords.heading;
    if(Number.isFinite(h)&&h>=0){state.cog=h;$("cog").textContent=Math.round(h).toString();}
    $("lat").textContent=fmt(c[0]);$("lon").textContent=fmt(c[1]);$("accuracy").textContent=Math.round(state.accuracy)+" m";
    $("coordStatus").textContent=fmt(c[0],5)+", "+fmt(c[1],5);
    $("speed").textContent=state.speed.toFixed(1);
    setGpsStatus("GPS active",true);
    if(!state.boatMarker){
      state.boatMarker=L.marker(c,{icon:L.divIcon({className:"boat-marker",html:'<div style="width:23px;height:23px;border-radius:50%;background:#b77aff;border:3px solid white;box-shadow:0 0 0 6px #b77aff33"></div>',iconSize:[23,23],iconAnchor:[11,11]})}).addTo(map).bindPopup("Your boat");
    }else state.boatMarker.setLatLng(c);
    if(state.trackOn){
      const last=state.track[state.track.length-1];
      if(!last||distanceM(last,c)>3){state.track.push({lat:c[0],lon:c[1],time:new Date().toISOString()});state.trackLine.setLatLngs(state.track.map(p=>[p.lat,p.lon]));persist();}
    }
  }
  function distanceM(a,b){const r=6371000,rad=x=>x*Math.PI/180,dl=rad(b[0]-a[0]),dn=rad(b[1]-a[1]);const x=Math.sin(dl/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dn/2)**2;return 2*r*Math.asin(Math.sqrt(x));}
  function startGps(){
    if(!("geolocation" in navigator)){toast("This browser does not support GPS.");return;}
    if(state.watchId!==null){navigator.geolocation.clearWatch(state.watchId);state.watchId=null;$("gpsBtn").innerHTML="<span>◎</span> Start GPS";setGpsStatus("GPS paused");toast("GPS paused");return;}
    state.watchId=navigator.geolocation.watchPosition(updatePosition,e=>{setGpsStatus(e.code===1?"Location permission denied":"Waiting for GPS fix");toast(e.code===1?"Allow location access in iPhone Settings.":"GPS unavailable: "+e.message);},{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
    $("gpsBtn").innerHTML="<span>Ⅱ</span> Stop GPS";setGpsStatus("Waiting for GPS…");
  }
  function onOrientation(e){
    let h=null;
    if(Number.isFinite(e.webkitCompassHeading))h=e.webkitCompassHeading;
    else if(Number.isFinite(e.alpha))h=(360-e.alpha)%360;
    if(h!==null){state.heading=(h+360)%360;$("heading").textContent=Math.round(state.heading).toString();document.querySelector(".hdg-line").style.transform=`rotate(${state.heading}deg)`;document.querySelector(".boat-icon").style.transform=`rotate(${state.heading}deg)`;}
  }
  async function startCompass(){
    try{
      if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){
        const result=await DeviceOrientationEvent.requestPermission();if(result!=="granted"){toast("Compass permission was not granted.");return;}
      }
      window.addEventListener("deviceorientation",onOrientation,true);
      toast("Compass enabled if supported by this device/browser.");
    }catch(e){toast("Compass access unavailable in this browser.");}
  }
  function addWaypoint(latlng){
    const p={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:"Waypoint "+(state.waypoints.length+1),lat:latlng.lat,lon:latlng.lng};
    state.waypoints.push(p);persist();renderWaypoints();renderMapLayers();toast("Waypoint added");
  }
  map.on("click",e=>addWaypoint(e.latlng));
  function renderMapLayers(){
    state.wpLayer.clearLayers();
    state.waypoints.forEach((p,i)=>{
      const marker=L.marker([p.lat,p.lon],{icon:L.divIcon({className:"wp-marker",html:`<div style="width:27px;height:27px;border-radius:9px;background:#7954c4;border:2px solid #fff;color:white;font-weight:800;font-size:11px;display:grid;place-items:center;box-shadow:0 2px 8px #0006">${i+1}</div>`,iconSize:[27,27],iconAnchor:[13,13]})});
      marker.bindPopup(`<b>${escapeHtml(p.name)}</b><br>${fmt(p.lat)}, ${fmt(p.lon)}<br><button onclick="window.renameWp('${p.id}')">Rename</button> <button onclick="window.routeToWp('${p.id}')">Add to route</button>`);
      state.wpLayer.addLayer(marker);
    });
    state.routeLine.setLatLngs(state.routePoints.map(p=>[p.lat,p.lon]));
    state.trackLine.setLatLngs(state.track.map(p=>[p.lat,p.lon]));
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  window.renameWp=id=>{const p=state.waypoints.find(x=>x.id===id);if(!p)return;const name=prompt("Waypoint name:",p.name);if(name&&name.trim()){p.name=name.trim().slice(0,60);persist();renderWaypoints();renderMapLayers();}};
  window.routeToWp=id=>{const p=state.waypoints.find(x=>x.id===id);if(!p)return;if(!state.routePoints.some(x=>x.id===id))state.routePoints.push({...p});persist();renderMapLayers();updateRouteInfo();toast("Added to route");};
  function renderWaypoints(){
    const list=$("waypointList");
    if(!state.waypoints.length){list.innerHTML='<div class="empty-state">No waypoints yet</div>';return;}
    list.innerHTML=state.waypoints.map((p,i)=>`<div class="wp-row"><div class="wp-number">${i+1}</div><div class="wp-main"><strong>${escapeHtml(p.name)}</strong><small>${fmt(p.lat)}, ${fmt(p.lon)}</small></div><button data-go="${p.id}">Go</button><button data-route="${p.id}">Route</button><button data-del="${p.id}">×</button></div>`).join("");
    list.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{const p=state.waypoints.find(x=>x.id===b.dataset.go);map.setView([p.lat,p.lon],15);});
    list.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>window.routeToWp(b.dataset.route));
    list.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{state.waypoints=state.waypoints.filter(p=>p.id!==b.dataset.del);state.routePoints=state.routePoints.filter(p=>p.id!==b.dataset.del);persist();renderWaypoints();renderMapLayers();updateRouteInfo();});
  }
  function updateRouteInfo(){
    if(!state.routePoints.length){$("routeInfo").textContent=state.routeOn?"Route mode active — tap map to add route points.":"Tap the map or ＋ to add a waypoint. Use the route button to start/finish a route.";return;}
    let total=0;for(let i=1;i<state.routePoints.length;i++)total+=distanceM([state.routePoints[i-1].lat,state.routePoints[i-1].lon],[state.routePoints[i].lat,state.routePoints[i].lon]);
    $("routeInfo").textContent=`${state.routePoints.length} route point${state.routePoints.length===1?"":"s"} • ${ (total/1852).toFixed(2) } nautical miles${state.routeOn?" • route mode active":""}`;
  }
  const originalAddWaypoint=addWaypoint;
  // In route mode, map taps also add route points.
  map.on("click",e=>{if(state.routeOn){const p={id:"route-"+Date.now(),name:"Route point "+(state.routePoints.length+1),lat:e.latlng.lat,lon:e.latlng.lng};state.routePoints.push(p);persist();renderMapLayers();updateRouteInfo();}});
  $("layersBtn").onclick=()=>$("layerPanel").classList.toggle("hidden");
  $("closeLayers").onclick=()=>$("layerPanel").classList.add("hidden");
  document.querySelectorAll('input[name="baseLayer"]').forEach(el=>el.onchange=()=>{if(el.value==="satellite"&&el.checked){map.removeLayer(street);satellite.addTo(map);}if(el.value==="street"&&el.checked){map.removeLayer(satellite);street.addTo(map);}});
  $("seamarksToggle").onchange=e=>e.target.checked?seamarks.addTo(map):map.removeLayer(seamarks);
  $("locateBtn").onclick=()=>{if(state.position)map.setView(state.position,Math.max(map.getZoom(),15));else toast("Start GPS first.");};
  $("addWpBtn").onclick=()=>{const c=state.position?L.latLng(...state.position):map.getCenter();addWaypoint(c);};
  $("routeBtn").onclick=()=>{state.routeOn=!state.routeOn;if(!state.routeOn&&state.routePoints.length===1)toast("Add another point to create a route.");$("routeBtn").style.borderColor=state.routeOn?"#b77aff":"";updateRouteInfo();toast(state.routeOn?"Route mode on — tap map to add route points":"Route mode finished");};
  $("gpsBtn").onclick=()=>{startGps();startCompass();};
  $("trackBtn").onclick=()=>{state.trackOn=!state.trackOn;$("trackBtn").innerHTML=state.trackOn?"<span>■</span> Stop recording":"<span>●</span> Record track";$("trackBtn").classList.toggle("primary",state.trackOn);toast(state.trackOn?"Track recording started":"Track recording stopped");persist();};
  $("exportTrackBtn").onclick=()=>{if(!state.track.length){toast("No track points to export yet.");return;}download("marine-nav-track.gpx",gpxTrack(state.track),"application/gpx+xml");};
  $("exportWpBtn").onclick=()=>{if(!state.waypoints.length){toast("No waypoints to export.");return;}const content="<?xml version=\"1.0\"?><gpx version=\"1.1\" creator=\"Marine Nav\" xmlns=\"http://www.topografix.com/GPX/1/1\">"+state.waypoints.map(p=>`<wpt lat="${p.lat}" lon="${p.lon}"><name>${escapeXml(p.name)}</name></wpt>`).join("")+"</gpx>";download("marine-nav-waypoints.gpx",content,"application/gpx+xml");};
  $("clearRouteBtn").onclick=()=>{state.routePoints=[];state.routeOn=false;persist();renderMapLayers();updateRouteInfo();toast("Route cleared");};
  $("clearWpBtn").onclick=()=>{if(!confirm("Delete all saved waypoints?"))return;state.waypoints=[];state.routePoints=[];persist();renderWaypoints();renderMapLayers();updateRouteInfo();};
  function escapeXml(s){return String(s).replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));}
  function gpxTrack(points){return '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Marine Nav" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Marine Nav Track</name><trkseg>'+points.map(p=>`<trkpt lat="${p.lat}" lon="${p.lon}"><time>${p.time}</time></trkpt>`).join("")+'</trkseg></trk></gpx>';}
  function download(name,content,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href);toast("Export prepared");}
  renderWaypoints();renderMapLayers();updateRouteInfo();
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
  // If no location permission is granted, retain a useful initial map view.
})();
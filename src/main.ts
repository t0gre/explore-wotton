import mapboxgl, { Map, MercatorCoordinate, type CustomLayerInterface, type LngLatLike } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import * as THREE from 'three'

type POIMarker = {
    lnglat: LngLatLike
    altitudeRelativeToSceneOrigin: number
    text: string
}

const sceneOrigin: LngLatLike = [-2.35104, 51.63764]

const markers: POIMarker[] = [
//     {
//     lnglat: [-2.35208, 51.63766],
//     altitudeRelativeToSceneOrigin: 1.3,
//     text: 'Cotswold Book Room'
// },
// {
//     lnglat: [-2.35315, 51.63781],
//     altitudeRelativeToSceneOrigin: 1.5,
//     text: 'Tap Room'
// },
// {
//     lnglat: [-2.35497, 51.63814],
//     altitudeRelativeToSceneOrigin: 1,
//     text: 'The Royal Oak' 
// },
{
    lnglat: [-2.35106, 51.63764],
    altitudeRelativeToSceneOrigin: 2,
    text: 'The Edge Coffee Shop' 
},
{
    lnglat: [-2.35102, 51.63764],
    altitudeRelativeToSceneOrigin: 2,
    text: 'Clarences' 
}

] 


mapboxgl.accessToken = 'pk.eyJ1IjoidG9tZ3JlZW53b29kIiwiYSI6ImNsb2E5dThjNzBsbjkyanFxd2hiOHB0bTMifQ.OnRKHkIO_7GKC7vSvdx7og';


/*
* Helper function used to get threejs-scene-coordinates from mercator coordinates.
* This is just a quick and dirty solution - it won't work if points are far away from each other
* because a meter near the north-pole covers more mercator-units
* than a meter near the equator.
*/
function calculateDistanceMercatorToMeters(
    from: MercatorCoordinate, 
    to: MercatorCoordinate
) {
    const mercatorPerMeter = from.meterInMercatorCoordinateUnits();
    // mercator x: 0=west, 1=east
    const dEast = to.x - from.x;
    const dEastMeter = dEast / mercatorPerMeter;
    // mercator y: 0=north, 1=south
    const dNorth = from.y - to.y;
    const dNorthMeter = dNorth / mercatorPerMeter;
    return {dEastMeter, dNorthMeter};
}

const map = new mapboxgl.Map({
    container: 'map',
    antialias: true,
    zoom: 18,
    center: sceneOrigin,
    pitch: 80,
    bearing: 280,
    // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
    style: 'mapbox://styles/tomgreenwood/clymqewzs002001r12a8g3z4f',
    config: {
        // Initial configuration for the Mapbox Standard style set above. By default, its ID is `basemap`.
        basemap: {
            // Here, we're disabling all of the 3D layers such as landmarks, trees, and 3D extrusions.
            show3dObjects: false,
    
        },
    }
});

map.on('style.load', () => {
    map.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
    });

    // add the DEM source as a terrain layer 
    map.setTerrain({ 'source': 'mapbox-dem' });
});
  


 //////// models
type ThreeEngine = {
    camera: THREE.Camera
    scene: THREE.Scene
    map: Map
    renderer: THREE.WebGLRenderer
}

// configuration of the custom layer for a 3D model per the CustomLayerInterface
const customLayer: CustomLayerInterface & { three?: ThreeEngine } = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map: Map, gl: WebGLRenderingContext) {

        const camera = new THREE.Camera();
        const scene = new THREE.Scene();

        // lighting
        const ambientLight = new THREE.AmbientLight(0xeeeeff, 0.4)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(0, 150, 100).normalize();
        scene.add(ambientLight, directionalLight);
        
        // shapes
        const sphereGeometry = new THREE.SphereGeometry(2)
        const sphereMesh = new THREE.Mesh(sphereGeometry, new THREE.MeshLambertMaterial({color: 0xf7e0a1}))
         

        // Getting model x and y (in meters) relative to scene origin.
        const sceneOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(sceneOrigin);

        for (const marker of markers) {
           
            const markerMercator = mapboxgl.MercatorCoordinate.fromLngLat(marker.lnglat);
            const {dEastMeter: modelEast, dNorthMeter: modelNorth} = calculateDistanceMercatorToMeters(sceneOriginMercator, markerMercator);
            
            const markerMesh = sphereMesh.clone()   
            markerMesh.position.set(modelEast, marker.altitudeRelativeToSceneOrigin, modelNorth);

            scene.add(markerMesh);
        
        }
       

        // use the Mapbox GL JS map canvas for three.js
        const renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        });
        renderer.autoClear = false;

        this.three = {
            camera, scene, map, renderer
        }
    },
    render: function (_, matrix) {

        const three = this.three!

        const offsetFromCenterElevation = map.queryTerrainElevation(sceneOrigin) || 0;
                    const sceneOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(sceneOrigin, offsetFromCenterElevation);

                    const sceneTransform = {
                        translateX: sceneOriginMercator.x,
                        translateY: sceneOriginMercator.y,
                        translateZ: sceneOriginMercator.z,
                        scale: sceneOriginMercator.meterInMercatorCoordinateUnits()
                    };

                    const m = new THREE.Matrix4().fromArray(matrix);
                    const l = new THREE.Matrix4()
                        .makeTranslation(sceneTransform.translateX, sceneTransform.translateY, sceneTransform.translateZ)
                        .scale(new THREE.Vector3(sceneTransform.scale, -sceneTransform.scale, sceneTransform.scale));
        
        
        three.camera.projectionMatrix = m.multiply(l);
        three.renderer.resetState();
        three.renderer.render(this.three!.scene, this.three!.camera);
        three.map.triggerRepaint();
    }
};

map.on('style.load', () => {
      map.addLayer(customLayer);
});


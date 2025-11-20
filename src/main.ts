import mapboxgl, { Map, MercatorCoordinate, type CustomLayerInterface, type LngLatLike } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import * as THREE from 'three'

type POIMarker = {
    lnglat: LngLatLike
    altitudeRelativeToSceneOrigin: number
    text: string
    photo: string
}

const sceneStartOrigin: LngLatLike = [-2.35104, 51.63764]
let sceneElevation = 89

const sceneOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(sceneStartOrigin, sceneElevation); 
const sceneTransform = {
    translateX: sceneOriginMercator.x,
    translateY: sceneOriginMercator.y,
    translateZ: sceneOriginMercator.z,
    scale: sceneOriginMercator.meterInMercatorCoordinateUnits()
};

const locationPointerGeometry = new THREE.ConeGeometry(0.5, 2, 8)
const locationPointerMaterial = new THREE.MeshStandardMaterial({color: 0xffffdd})

const markers: POIMarker[] = [
    {
    lnglat: [-2.35208, 51.63766],
    altitudeRelativeToSceneOrigin: 10,
    text: 'Cotswold Book Room',
    photo: 'bridge.jpg'
},
{
    lnglat: [-2.35296, 51.63793],
    altitudeRelativeToSceneOrigin: 15,
    text: 'Clarences',
    photo: 'bridge.jpg'
},
{
    lnglat: [-2.35497, 51.63814],
    altitudeRelativeToSceneOrigin: 18,
    text: 'The Royal Oak' ,
    photo: 'bridge.jpg'
},
{
    lnglat: [-2.35323, 51.63780],
    altitudeRelativeToSceneOrigin: 15,
    text: 'The Edge Coffee Shop' ,
    photo: 'bridge.jpg'
},
{
    lnglat: [-2.35395, 51.63793],
    altitudeRelativeToSceneOrigin: 17,
    text: 'Daisy Daisy' ,
    photo: 'bridge.jpg'
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
    center: sceneStartOrigin,
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
type RenderState = {
    three: {
        camera: THREE.Camera
        scene: THREE.Scene
        renderer: THREE.WebGLRenderer
    }
    mapbox: {
        map: Map
    }
}

// configuration of the custom layer for a 3D model per the CustomLayerInterface
const customLayer: CustomLayerInterface & { state?: RenderState } = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map: Map, gl: WebGLRenderingContext) {

        const camera = new THREE.Camera();
        const scene = new THREE.Scene();

        // In threejs, y points up - we're rotating the scene such that it's y points along maplibre's up.
        scene.rotateX(Math.PI / 2);
        // In threejs, z points toward the viewer - mirroring it such that z points along maplibre's north.
        scene.scale.multiply(new THREE.Vector3(1, 1, -1));
        // We now have a scene with (x=east, y=up, z=north)

        // lighting
        const ambientLight = new THREE.AmbientLight(0xeeeeff, 1)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(180, 150, -100).normalize();
        scene.add(ambientLight, directionalLight);
        
        // shapes
        const billboardGeometry = new THREE.BoxGeometry(4,3,0.5)

        
        // 1. Create a texture loader
        const loader = new THREE.TextureLoader();

        


        // Getting model x and y (in meters) relative to scene origin.
        const sceneOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(sceneStartOrigin);

        for (const marker of markers) {
           
            const markerObject = new THREE.Object3D()
            const markerMercator = mapboxgl.MercatorCoordinate.fromLngLat(marker.lnglat);
            const {dEastMeter: modelEast, dNorthMeter: modelNorth} = calculateDistanceMercatorToMeters(sceneOriginMercator, markerMercator);
            markerObject.position.set(modelEast, marker.altitudeRelativeToSceneOrigin, modelNorth);
            markerObject.rotateY(Math.PI * Math.random()) // add some randomness so that they don't all have the same angle

            
            const material = new THREE.MeshStandardMaterial({
                map: loader.load(marker.photo)
            });
            const billboardMesh = new THREE.Mesh(billboardGeometry, material)

            const locationPointer = new THREE.Mesh(locationPointerGeometry, locationPointerMaterial) 
            locationPointer.rotateX(Math.PI) // turn it upside down
            locationPointer.position.set(0,-3, 0)

            markerObject.add(billboardMesh, locationPointer)
           
            scene.add(markerObject);
        
        }
       

        // use the Mapbox GL JS map canvas for three.js
        const renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        });
        renderer.autoClear = false;

        this.state = {
            three: {
                camera, scene, renderer
            },
            mapbox: { map }
        } 
    },
    render: function (_, matrix) {

        const state = this.state!

        // create three camera from mapbox matrix
        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
            .makeTranslation(sceneTransform.translateX, sceneTransform.translateY, sceneTransform.translateZ)
            .scale(new THREE.Vector3(sceneTransform.scale, -sceneTransform.scale, sceneTransform.scale))
        state.three.camera.projectionMatrix = m.multiply(l);

        // update markers    
        state.three.scene.children.forEach(child => child.rotateY(Math.PI/200))

        state.three.renderer.resetState();
        state.three.renderer.render(state.three.scene, state.three.camera);
        state.mapbox.map.triggerRepaint();
    }
};

map.on('style.load', () => {
      map.addLayer(customLayer);
});


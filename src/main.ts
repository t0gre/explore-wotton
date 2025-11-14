  import mapboxgl from 'mapbox-gl'
  import 'mapbox-gl/dist/mapbox-gl.css';

  mapboxgl.accessToken = 'pk.eyJ1IjoidG9tZ3JlZW53b29kIiwiYSI6ImNsb2E5dThjNzBsbjkyanFxd2hiOHB0bTMifQ.OnRKHkIO_7GKC7vSvdx7og';
    const map = new mapboxgl.Map({
        container: 'map',
        antialias: true,
        zoom: 18,
        center: [-2.35104, 51.63764],
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
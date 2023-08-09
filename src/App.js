import logo from './logo.svg';
import './App.css';
import { DeckGL } from 'deck.gl';
import React from 'react';
import { Map, ViewState } from 'react-map-gl';
import { debounce } from 'lodash';
import {HeatmapLayer, ContourLayer} from '@deck.gl/aggregation-layers';
import {COORDINATE_SYSTEM} from '@deck.gl/core';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiaHl1bmtzZW85MSIsImEiOiJjazgwZTFhZ2MwNHJ0M25xaG1hMTZhbGwxIn0.IgzUxjwNb1-3gEkVT2pF_Q';
const DATA_URL = './cdmsWithPositions.json';

const CONTOURS = [
  {threshold: 1, color: [255, 0, 0, 255], strokeWidth: 1}, // => Isoline for threshold 1
  {threshold: 5, color: [0, 255, 0], strokeWidth: 2}, // => Isoline for threshold 5
  {threshold: [6, 10], color: [0, 0, 255, 128]} // => Isoband for threshold range [6, 10)
];

const INITIAL_VIEW_STATE = {
  longitude: -122.4,
  latitude: 37.74,
  zoom: 11,
  maxZoom: 20,
  pitch: 0,
  bearing: 0
};

function App({
  data = DATA_URL,
  intensity = 1,
  threshold = 0.1,
  radiusPixels = 32
}) {
  const [initialViewState, setInitialViewState] = React.useState(INITIAL_VIEW_STATE);
  const [deckViewState, setDeckViewState] = React.useState(null);
  const [usePcWeight, setUsePcWeight] = React.useState(false);

  const heatmapLayer = new HeatmapLayer({
    data,
    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
    id: 'heatmap-layer',
    pickable: false,
    getPosition: (d) => [d.position.longitude, d.position.latitude, d.position.altitude],
    getWeight: (d) => {
      if (usePcWeight) {
        const val = parseFloat(d.pc);
        if (!isNaN(val)) {
          const match = d.pc.split('.')[1].match(/^0+/);
          const level = 4 - parseInt(match ? match[0].length : 0);
          return level
        }
        return 0
      }
      return 1
    },
    radiusPixels,
    intensity,
    threshold,
    updateTriggers: {
      getWeight: usePcWeight
    }
  });

  const debouncedSetViewDeckState = debounce((viewState) => {
    if (viewState) {
      setDeckViewState(viewState);
    }
  }, 350);

  return (
    <div className="App">
      <button className="toggle-pc" onClick={() => setUsePcWeight(v => !v)}>{usePcWeight ? 'Turn off Pc Weight' : 'Turn on Pc Weight'}</button>
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={[heatmapLayer]}
        onViewStateChange={(deckState) => debouncedSetViewDeckState(deckState.viewState)}
      >
        <Map
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle='mapbox://styles/hyunkseo91/clkvncy1c009d01qp23rsdf04'
        />
      </DeckGL>
    </div>
  );
}

export default App;

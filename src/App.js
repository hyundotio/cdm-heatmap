import logo from './logo.svg';
import './App.css';
import { DeckGL } from 'deck.gl';
import React from 'react';
import { Map, ViewState } from 'react-map-gl';
import { debounce } from 'lodash';
import {ScatterplotLayer} from '@deck.gl/layers';
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
  const [useScatterplotLayer, setScatterplotLayer] = React.useState(false);

  const scatterplotLayer = new ScatterplotLayer({
    id: 'scatterplot-layer',
    data,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    radiusScale: 6,
    radiusMinPixels: 6,
    radiusMaxPixels: 100,
    lineWidthMinPixels: 1,
    getPosition: d => [d.position.longitude, d.position.latitude, d.position.altitude],
    getRadius: d => 12,
    getLineColor: d => {
      const val = parseFloat(d.pc);
      const alpha = useScatterplotLayer ? 255 : 0;
      let color = [0,0,0,alpha];
      if (!isNaN(val)) {
        const match = d.pc.split('.')[1].match(/^0+/);
        const level = 4 - parseInt(match ? match[0].length : 0);
        if (level === 3) color = [255,255,255,alpha];
      } else {
        color = [255,255,255,0]
      }
      return color
    },
    getFillColor: d => {
      const alpha = useScatterplotLayer ? 255 : 0;
      const val = parseFloat(d.pc);
      let color = [255,255,178,alpha];
      if (!isNaN(val)) {
        const match = d.pc.split('.')[1].match(/^0+/);
        const level = 4 - parseInt(match ? match[0].length : 0);
        if (level === 1) color = [254,217,118,alpha];
        if (level === 2) color = [253,141,60,alpha];
        if (level === 3) color = [189,0,38,alpha];
      } else {
        color = [255,255,255,0]
      }
      return color
    },
    updateTriggers: {
      getLineColor: useScatterplotLayer,
      getFillColor: useScatterplotLayer
    }
  });


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
    visible: !useScatterplotLayer,
    updateTriggers: {
      visible: useScatterplotLayer,
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
      <button className="toggle-pc" disabled={useScatterplotLayer} onClick={() => setUsePcWeight(v => !v)}>{usePcWeight ? 'Turn off Pc Weight' : 'Turn on Pc Weight'}</button>
      <button className="toggle-layer" onClick={() => setScatterplotLayer(v => !v)}>{useScatterplotLayer ? 'View heatmap' : 'View scatterplot'}</button>
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={[heatmapLayer, scatterplotLayer]}
        onViewStateChange={(deckState) => debouncedSetViewDeckState(deckState.viewState)}
        getTooltip={({object}) => {
          if (object) {
            return {
              html: (
                `
                <div>CDM ID: ${object.cdmId}</div>
                <div>PC: ${parseFloat(object.pc).toExponential().toUpperCase()}</div>
                <div>MD: ${object.md}m</div>
                <div>Object 1: ${object.rso1ID}, ${object.rso1Name} (${object.rso1Type})</div>
                <div>Object 2: ${object.rso2ID}, ${object.rso2Name} (${object.rso2Type})</div>
                <div>TCA: ${object.tca}</div>
                `
              )
            }
          }
        }}
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

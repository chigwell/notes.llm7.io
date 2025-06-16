import store from 'store-js';
import { createStore } from 'framework7/lite';


const storeMemory = createStore({
  state: {
    text: store.get('text') || '',
    UUID: store.get('UUID') || '',
  },
  getters: {
    text({ state }) {
      return state.text;
    },
    UUID({ state }) {
      return state.UUID;
    },
  },
  actions: {
    updateText({ state }, text) {
      state.text = text;
      store.set('text', text);
    },
    updateUUID({ state }, UUID) {
      state.UUID = UUID;
      store.set('UUID', UUID);
    },
  },
})
export default store;

import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    assetFilters: { search: '', status: '', type: '', branchId: '' },
  },
  reducers: {
    toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
    setAssetFilter(state, { payload }) {
      state.assetFilters = { ...state.assetFilters, ...payload };
    },
    resetAssetFilters(state) {
      state.assetFilters = { search: '', status: '', type: '', branchId: '' };
    },
  },
});

export const { toggleSidebar, setAssetFilter, resetAssetFilters } = uiSlice.actions;
export default uiSlice.reducer;

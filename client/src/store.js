import Vue from 'vue'
import Vuex from 'vuex'
import router from './router';

Vue.use(Vuex)

import {
  GET_POSTS,
  ADD_POST,
  LOGIN_USER,
  REGISTER_USER,
  GET_CURRENT_USER,
  SEARCH_POSTS
} from './queries';
import { defaultClient as apolloClient } from './main';

export default new Vuex.Store({
  state: {
    posts: [],
    loading: false,
    user: null,
    error: null,
    authError: null,
    searchResults: []
  },
  mutations: {
    setPosts: (state, posts) => {
      state.posts = posts;
    },
    setSearchResults: (state, payload) => {
      if (payload !== null) {
        state.searchResults = payload;
      }
    },
    setLoading: (state, value) => {
      state.loading = value;
    },
    setUser: (state, user) => {
      state.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    setError: (state, error) => {
      state.error = error;
    },
    setAuthError: (state, error) => {
      state.authError = error;
    },
    clearUser: state => {
      state.user = null;
      localStorage.setItem('user', '');
    },
    clearError: state => (state.error = null),
    clearSearchResults: state => {
      state.searchResults = []
    }
  },
  actions: {
    initUser: ({ commit, state }) => {
      if (localStorage.getItem('user')) {
        state.user = JSON.parse(localStorage.getItem('user'));
      }
    },
    getCurrentUser: ({ commit }) => {
      commit('setLoading');
      apolloClient.query({
        query: GET_CURRENT_USER
      }).then(({ data }) => {
        commit('setUser', data.getCurrentUser);
        commit('setLoading', false);
      }).catch(err => {
        console.log(err)
        commit('setLoading', false);
      });

    },
    getPosts: ({ commit }) => {
      commit('setLoading', true);
      apolloClient
        .query({
          query: GET_POSTS
        }).then(({ data }) => {
        commit('setPosts', data.getPosts);
        commit('setLoading', false);
      }).catch(err => {
        console.log(err)
        commit('setLoading', false);
      });
    },
    searchPosts: ({ commit }, payload) => {
      apolloClient.query({
        query: SEARCH_POSTS,
        variables: payload,
      }).then(({ data }) => {
        commit('setSearchResults', data.searchPosts);
      }).catch(err => console.log(err));
    },
    addPost: ({ commit }, payload) => {
      apolloClient
        .mutate({
          mutation: ADD_POST,
          variables: payload,
          update: (cache, { data: { addPost } }) => {
            // First read the query you want to update
            const data = cache.readQuery({ query: GET_POSTS });
            // Create updated data
            data.getPosts.unshift(addPost);
            // Write updated data back to query
            cache.writeQuery({
              query: GET_POSTS,
              data
            });
          },
          // optimistic response ensures data is added immediately as we specified for the update function
          optimisticResponse: {
            __typename: 'Mutation',
            addPost: {
              __typename: 'Post',
              _id: -1,
              ...payload
            }
          }
        })
        .then(({ data }) => {
          console.log(data.addPost);
        })
        .catch(err => {
          console.error(err);
        });
    },
    loginUser: ({ commit }, payload) => {
      commit('clearError');
      commit("setLoading", true);
      // prevent malformed token
      localStorage.setItem("token", "");
      apolloClient
        .mutate({
          mutation: LOGIN_USER,
          variables: payload
        })
        .then(({ data }) => {
          console.log(data);
          commit("setLoading", false);
          localStorage.setItem('token', data.loginUser.token);
          commit('setUser', data.loginUser.user);
          router.push('/');
        }).catch(err => {
        commit('setError', err);
        commit("setLoading", false);
        console.log(err)

      });
    },
    registerUser: ({ commit }, payload) => {
      commit('clearError');
      commit('setLoading', true);
      apolloClient
        .mutate({
          mutation: REGISTER_USER,
          variables: payload
        })
        .then(({ data }) => {
          commit("setLoading", false);
          localStorage.setItem("token", data.registerUser.token);
          router.go();
        })
        .catch(err => {
          commit("setLoading", false);
          commit("setError", err);
          console.error(err);
        });

    },
    logoutUser: async ({ commit }, payload) => {
      commit('clearUser');
      localStorage.setItem('token', '');

      await apolloClient.resetStore();
      router.push('/');
    }
  },
  getters: {
    userFavorites: state => state.user && state.user.favorites,
  }
})

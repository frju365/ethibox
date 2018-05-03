import 'babel-polyfill';
import 'whatwg-fetch';
import React from 'react';
import ReactDOM from 'react-dom';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { listApplicationsSuccess } from './application/ApplicationActions';
import reducers from './app/reducers';
import App from './app/App';
import { isConnect, dataToken, checkStatus } from './utils';

const interval = 5000;

let store;
if (process.env.NODE_ENV === 'production') {
    store = createStore(reducers, applyMiddleware(thunk));
} else {
    store = createStore(reducers, composeWithDevTools(applyMiddleware(thunk)));
}

if (isConnect()) {
    setInterval(async () => {
        await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('token') },
            body: JSON.stringify({ query: `{ applications(email: "${dataToken.email}") { name releaseName domainName category state port } }` }),
        })
            .then(checkStatus)
            .then(({ data }) => store.dispatch(listApplicationsSuccess(data.applications)));
    }, interval);
}

document.addEventListener('keypress', ({ key }) => {
    const modal = store.getState().ModalReducer;

    if (modal.isOpen && (key === 'Escape')) {
        store.dispatch({ type: 'CLOSE_MODAL' });
    }
});

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root'),
);

import { checkStatus } from '../utils';
import { openModal } from '../modal/ModalActions';
import { openLoader, closeLoader } from '../loader/LoaderActions';

export const installApplicationSuccess = application => ({ type: 'INSTALL_APPLICATION_SUCCESS', application });
export const uninstallApplicationSuccess = (releaseName, force) => ({ type: 'UNINSTALL_APPLICATION_SUCCESS', releaseName, force });
export const listApplicationsSuccess = applications => ({ type: 'LIST_APPLICATIONS_SUCCESS', applications });

export const listApplications = () => (dispatch) => {
    dispatch(openLoader('Loading applications...'));

    fetch('/api/applications/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('token') },
    })
        .then(checkStatus)
        .then(({ apps }) => dispatch(listApplicationsSuccess(apps)) && dispatch(closeLoader()))
        .catch(({ message }) => dispatch(openModal({ hasErrored: true, errorMessage: message })) && dispatch(closeLoader()));
};

export const installApplication = application => async (dispatch) => {
    const { releaseName } = application;
    dispatch(installApplicationSuccess(application));

    fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('token') },
        body: JSON.stringify(application),
    })
        .then(checkStatus)
        .catch(({ message }) => {
            dispatch(uninstallApplicationSuccess(releaseName));
            dispatch(openModal({ hasErrored: true, errorMessage: message }));
        });
};

export const uninstallApplication = releaseName => (dispatch) => {
    dispatch(uninstallApplicationSuccess(releaseName));

    fetch(`/api/applications/${releaseName}`, {
        method: 'DELETE',
        headers: { 'x-access-token': localStorage.getItem('token') },
    })
        .then(checkStatus)
        .catch(({ message }) => dispatch(openModal({ hasErrored: true, errorMessage: message })));
};

export const editDomainName = application => (dispatch) => {
    const { releaseName } = application;

    fetch(`/api/applications/${releaseName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('token') },
        body: JSON.stringify(application),
    })
        .then(checkStatus)
        .catch(({ message }) => dispatch(openModal({ hasErrored: true, errorMessage: message })));
};

import {Navigate, Outlet} from 'react-router-dom';
import React, {useContext} from 'react';
import {AuthContext} from '../context/AuthContext.jsx';
import '../App.css';
import { getAuth } from 'firebase/auth';

const PrivateRoute = () => {
    const {currentUser} =getAuth();
    
    //console.log('Private Route Comp current user', currentUser);
    // If authorized, return an outlet that will render child elements
    // If not, return element that will navigate to login page
    return currentUser ? <Outlet /> : <Navigate to='/signin' replace={true} />;
};

export default PrivateRoute;
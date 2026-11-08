import * as React from 'react';
import { CommonActions } from '@react-navigation/native';

export const navigationRef = React.createRef();

export function resetTo(routeName, params) {
  if (!navigationRef.current?.isReady?.()) return;
  navigationRef.current.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, ...(params ? { params } : {}) }],
    })
  );
}


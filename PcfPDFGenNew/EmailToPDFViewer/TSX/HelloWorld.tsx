import * as React from 'react';
import { Label } from '@fluentui/react-components';

export interface IHelloWorldProps {
  name?: string;
}

export class HelloWorld extends React.Component<IHelloWorldProps> {
  public render(): React.ReactNode {
    console.log('HelloWorld render called');
    return (
      <Label>
        <b>Hello 11</b>
      </Label>
    )
  }
}

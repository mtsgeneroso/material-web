import 'jasmine';

import {installSkipWebAnimations} from './skip-animations.js';

describe('skip-animations test', () => {
  let element: HTMLElement;
  let uninstallFunction = () => {};

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
    uninstallFunction();
  });

  it('does not skip animations befor installing', () => {
    // Act
    element.animate(
        [
          {color: 'rgb(255, 255, 255'},
          {color: 'rgb(0, 0, 0)'},
        ],
        {duration: 1000});

    // Assert
    expect(getComputedStyle(element).color).toEqual('rgb(255, 255, 255)');
  });

  it('computes a thing when asked', () => {
    // Arrange
    uninstallFunction = installSkipWebAnimations();

    // Act
    element.animate(
        [
          {color: 'rgb(255, 255, 255'},
          {color: 'rgb(0, 0, 0)'},
        ],
        {duration: 1000});

    // Assert
    expect(getComputedStyle(element).color).toEqual('rgb(0, 0, 0)');
  });
});

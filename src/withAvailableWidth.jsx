/* eslint-disable comma-dangle, no-underscore-dangle */
import React, { PureComponent } from 'react';
import debounce from 'debounce';

const INITIAL_STATE = {
  availableWidth: undefined,
};

// Accumulate resize listeners and run them all as part of the resize handler.
// This way we only attach one actual event listener.
const resizeListeners = [];
const invokeResizeListeners = () => {
  resizeListeners.forEach(listener => listener());
};

let initialized = false;
function initializeListener() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('resize', invokeResizeListeners, false);
}

/**
 * HoC that injects a `availableWidth` prop to the component, equal to the
 * current width of the parent element.
 *
 * @param {Object} Component
 * @param {Object} [options]
 * @param {Function} [options.observer] - Default is a listener on window resize events.
 * @param {Number} [options.updateDebounce=300]
 * @return {Object} a wrapped Component
 */
function withAvailableWidth(
  Component,
  options = {}
) {
  initializeListener();
  const updateDebounce = options.updateDebounce === undefined
    ? 300
    : this.props.updateDebounce;

  class WithAvailableWidth extends PureComponent {
    constructor() {
      super();
      this.state = INITIAL_STATE;
      this._handleDivRef = this._handleDivRef.bind(this);
      this._updateWidth = updateDebounce
        ? debounce(this._updateWidth.bind(this), updateDebounce)
        : this._updateWidth.bind(this);
    }

    componentDidMount() {
      if (options.observer !== undefined) {
        this._unobserve = options.observer(this._containerElement, this._updateWidth);
        if (typeof this._unobserve !== 'function') {
          throw new Error(
            'The observer did not provide a way to unobserve. ' +
            'This will likely lead to memory leaks.'
          );
        }
      } else {
        resizeListeners.push(this._updateWidth);
        this._unobserve = () => {
          resizeListeners.splice(resizeListeners.indexOf(this._updateWidth), 1);
        };
      }

      this._updateWidth();
    }

    componentWillUnmount() {
      this._unobserve();
    }

    _updateWidth() {
      if (!this._containerElement) {
        throw new Error(
          'A withAvailableWidth component needs a parent element'
        );
      }
      const nextAvailableWidth = this._containerElement.offsetWidth;
      if (nextAvailableWidth !== this.state.availableWidth) {
        this.setState({ availableWidth: this._containerElement.offsetWidth });
      }
    }

    _handleDivRef(domElement) {
      if (!domElement) {
        return;
      }
      this._containerElement = domElement.parentNode;
    }

    render() {
      if (this.state.availableWidth === undefined) {
        // This div will live in the document for a brief moment, just long
        // enough for it to mount. We then use it to calculate its width, and
        // replace it immediately with the underlying component.
        return (
          <div ref={this._handleDivRef} />
        );
      }

      return (
        <Component
          availableWidth={this.state.availableWidth}
          {...this.props}
        />
      );
    }
  }

  WithAvailableWidth.WrappedComponent = Component;
  return WithAvailableWidth;
}

export { invokeResizeListeners };
export default withAvailableWidth;

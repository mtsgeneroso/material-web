/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Harness} from '@material/web/testing/harness.js';

import {ListItem} from './list-item.js';

/**
 * Test harness for list item.
 */
export class ListItemHarness extends Harness<ListItem> {
  override async getInteractiveElement() {
    await this.element.updateComplete;
    return this.element.renderRoot.querySelector('li') as HTMLElement;
  }
}

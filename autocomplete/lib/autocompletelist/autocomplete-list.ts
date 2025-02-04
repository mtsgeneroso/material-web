/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {List} from '@material/web/list/lib/list.js';
import {ARIARole} from '@material/web/types/aria.js';
import {ClassInfo} from 'lit/directives/class-map.js';

/** Base class for autocomplete list component. */
export class AutocompleteList extends List {
  override role: ARIARole = 'listbox';

  /** @soyTemplate */
  protected override getRenderClasses(): ClassInfo {
    return {
      ...super.getRenderClasses(),
      'md3-autocomplete-list': true,
    };
  }
}

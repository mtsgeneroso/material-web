/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// TODO(b/243558385): remove compat dependencies
import {observer} from '@material/web/compat/base/observer.js';
import {html, PropertyValues, TemplateResult} from 'lit';
import {property, query, queryAssignedElements, state} from 'lit/decorators.js';
import {ClassInfo, classMap} from 'lit/directives/class-map.js';
import {html as staticHtml, StaticValue} from 'lit/static-html.js';

import {List} from '../../list/lib/list.js';
import {MenuSurface} from '../../menusurface/lib/menu-surface.js';
import {TextField} from '../../textfield/lib/text-field.js';

import {AutocompleteItem} from './autocompleteitem/autocomplete-item.js';

/** @soyCompatible */
export abstract class Autocomplete extends TextField {
  static override shadowRootOptions:
      ShadowRootInit = {mode: 'open', delegatesFocus: true};

  override readonly role = 'combobox';
  override readonly ariaAutoComplete = 'list';

  /**
   * The ID on the list element, used for SSR.
   */
  @property({type: String}) listId = 'autocomplete-list';
  /**
   * The ID prefix for the item elements, used for SSR.
   */
  @property({type: String}) itemIdPrefix = 'autocomplete-item';

  protected abstract readonly menuSurfaceTag: StaticValue;
  protected abstract readonly listTag: StaticValue;

  @query('.md3-autocomplete__menu-surface') menuSurface?: MenuSurface|null;
  @query('.md3-autocomplete__list') list?: List|null;

  @queryAssignedElements({flatten: true})
  protected slottedItems?: AutocompleteItem[];

  @state()  // tslint:disable-next-line:no-new-decorators
  @observer(function(this: Autocomplete) {
    this.updateSelectedItem();
    this.ariaActiveDescendant = this.selectedItem?.itemId ?? null;
  })
  protected selectedItem: AutocompleteItem|null = null;

  /** @soyTemplate */
  override render(): TemplateResult {
    return html`<div class="md3-autocomplete ${
        classMap(this.getAutocompleteRenderClasses())}"
            @click=${this.handleClicked}
            @focusout=${this.handleFocusout}
            @action=${this.handleAction}
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
            @keyup=${this.handleKeyup}>
            ${super.render()}
            ${this.renderMenuSurface()}</div>`;
  }

  /** @soyTemplate */
  protected getAutocompleteRenderClasses(): ClassInfo {
    return {};
  }

  override firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.menuSurface!.anchor = this;
  }

  /** @soyTemplate */
  protected renderMenuSurface(): TemplateResult {
    return staticHtml`<${this.menuSurfaceTag}
      class="md3-autocomplete__menu-surface"
      .corner="BOTTOM_START"
      ?stayOpenOnBodyClick=${true}
    >
      <${this.listTag} class="md3-autocomplete__list">
        <slot></slot>
      </${this.listTag}>
    </${this.menuSurfaceTag}>`;
  }

  isOpen() {
    return this.menuSurface?.open || false;
  }

  open() {
    this.menuSurface?.show();
    this.ariaExpanded = 'true';
  }

  close() {
    this.menuSurface?.close();
    this.selectedItem = null;
    this.ariaExpanded = 'false';
  }

  protected handleClicked(event: PointerEvent) {
    // When clicking the list (not items nor text field) the menu should stay
    // open.
    if (this.isOpen() &&
        (event.target as Node)?.parentNode !== this.menuSurface) {
      this.close();
    } else {
      this.open();
    }
  }

  protected override handleFocusout() {
    if (this.matches(':focus-within')) {
      this.getInput().focus();
      return;
    }
    this.close();
    this.focused = false;
  }

  protected handleAction(event: CustomEvent<{item: AutocompleteItem}>) {
    const detail = event.detail;
    this.value = detail.item.headline;
  }

  protected handleKeydown(event: KeyboardEvent) {
    let bubble = true;
    const altKey = event.altKey;

    switch (event.key) {
      case 'Enter':
        if (this.selectedItem) {
          this.value = this.selectedItem.headline;
        }
        this.close();
        bubble = false;
        break;

      case 'ArrowDown':
        if (!this.slottedItems) return;
        if (this.slottedItems.length) {
          if (this.selectedItem) {
            this.selectedItem = this.getNextItem();
          } else {
            this.open();
            if (!altKey) {
              this.selectedItem = this.slottedItems[0];
            }
          }
        }
        bubble = false;
        break;

      case 'ArrowUp':
        if (!this.slottedItems) return;
        if (this.slottedItems.length) {
          if (this.selectedItem) {
            this.selectedItem = this.getPreviousItem();
          } else {
            this.open();
            if (!altKey) {
              this.selectedItem =
                  this.slottedItems[this.slottedItems.length - 1];
            }
          }
        }
        bubble = false;
        break;

      case 'Escape':
        if (this.isOpen()) {
          this.close();
        } else {
          this.value = '';
        }
        this.selectedItem = null;
        bubble = false;
        break;

      case 'Tab':
        if (this.selectedItem) {
          this.value = this.selectedItem.headline;
        }
        this.close();
        break;

      case 'Home':
        this.setSelectionRange(0, 0);
        this.selectedItem = null;
        bubble = false;
        break;

      case 'End':
        this.setSelectionRange(this.value.length, this.value.length);
        this.selectedItem = null;
        bubble = false;
        break;

      default:
        break;
    }

    if (bubble) return;
    event.stopPropagation();
    event.preventDefault();
  }

  protected handleKeyup(event: KeyboardEvent) {
    let bubble = true;

    switch (event.key) {
      case 'Backspace':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.selectedItem = null;
        bubble = false;
        break;

      default:
        break;
    }

    if (bubble) return;
    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * When selectedItem is updated, item prefixes and aria-selected status will
   * be updated along with scrolling the selected item into view, if needed.
   */
  private updateSelectedItem() {
    if (!this.slottedItems) return;
    this.slottedItems.forEach((item, index) => {
      item.itemId = `${this.itemIdPrefix}-${index}`;

      if (this.selectedItem && item === this.selectedItem && this.list) {
        item.ariaSelected = 'true';
        item.showFocusRing = true;

        // Scroll into view
        if (this.list.scrollTop + this.list.offsetHeight <
            item.offsetTop + item.offsetHeight) {
          this.list.scrollTop =
              item.offsetTop + item.offsetHeight - this.list.offsetHeight;
        } else if (this.list.scrollTop > item.offsetTop + 2) {
          this.list.scrollTop = item.offsetTop;
        }
      } else {
        item.ariaSelected = 'false';
        item.showFocusRing = false;
      }
    });
  }

  private getPreviousItem(): AutocompleteItem|null {
    if (!this.slottedItems) return null;
    const index =
        this.selectedItem ? this.slottedItems.indexOf(this.selectedItem) : 0;
    const length = this.slottedItems.length;
    return this.slottedItems[(index - 1 + length) % length];
  }

  private getNextItem(): AutocompleteItem|null {
    if (!this.slottedItems) return null;
    const index =
        this.selectedItem ? this.slottedItems.indexOf(this.selectedItem) : 0;
    const length = this.slottedItems.length;
    return this.slottedItems[(index + 1) % length];
  }
}

/**
 * @module ThemeEngine
 * @description Loads, validates, and applies themes. Injects CSS custom
 * properties into the document root so the shell UI reflects the active theme.
 * Also exposes a ThemeRenderContext used by the rendering engine.
 *
 * @status PLACEHOLDER — loads the default theme only; custom theme import deferred to v1.0
 */

import type { PlatformService, Theme, ThemeMetadata } from '@teacher-toolbox/types';
import type { SettingsService } from '@teacher-toolbox/settings';
import { DEFAULT_THEME } from './defaultTheme.js';

export interface ThemeRenderContext {
  colors: Theme['colors'];
  typography: Theme['typography'];
  decoration: Theme['decoration'];
  layout: Theme['layout'];
}

export class ThemeEngine implements PlatformService {
  readonly serviceId = 'theme-engine';

  private activeTheme: Theme = DEFAULT_THEME;
  private readonly registry = new Map<string, Theme>();

  constructor(private readonly settings: SettingsService) {
    this.registry.set(DEFAULT_THEME.id, DEFAULT_THEME);
  }

  async initialize(): Promise<void> {
    const themeId = await this.settings.get('defaultThemeId');
    await this.applyTheme(themeId);
    console.info(`[ThemeEngine] Initialised with theme: ${this.activeTheme.name}`);
  }

  async dispose(): Promise<void> { /* nothing to clean up */ }

  // ---------------------------------------------------------------------------
  // Theme management
  // ---------------------------------------------------------------------------

  async applyTheme(themeId: string): Promise<void> {
    const theme = this.registry.get(themeId) ?? DEFAULT_THEME;
    this.activeTheme = theme;
    this.injectCSSVariables(theme);
  }

  getActiveTheme(): Theme {
    return this.activeTheme;
  }

  listAvailableThemes(): ThemeMetadata[] {
    return [...this.registry.values()].map((t) => ({
      id:     t.id,
      name:   t.name,
      description: t.description,
      source: t.source,
    }));
  }

  registerTheme(theme: Theme): void {
    this.registry.set(theme.id, theme);
  }

  // ---------------------------------------------------------------------------
  // CSS variable injection — maps theme tokens → CSS custom properties
  // so that Svelte UI components can use var(--tt-accent) etc.
  // ---------------------------------------------------------------------------

  injectCSSVariables(theme: Theme, root: HTMLElement = document.documentElement): void {
    const c = theme.colors;
    const props: Record<string, string> = {
      '--tt-page-bg':           c.pageBg,
      '--tt-baseline-color':    c.baselineColor,
      '--tt-midline-color':     c.midlineColor,
      '--tt-topline-color':     c.toplineColor,
      '--tt-margin-line-color': c.marginLineColor,
      '--tt-text-primary':      c.textPrimary,
      '--tt-text-secondary':    c.textSecondary,
      '--tt-text-accent':       c.textAccent,
      '--tt-border-color':      c.borderColor,
      '--tt-accent':            c.accentColor,
    };

    for (const [prop, value] of Object.entries(props)) {
      root.style.setProperty(prop, value);
    }
  }

  // ---------------------------------------------------------------------------
  // Render context for the WorksheetRenderer
  // ---------------------------------------------------------------------------

  getRenderContext(): ThemeRenderContext {
    return {
      colors:     this.activeTheme.colors,
      typography: this.activeTheme.typography,
      decoration: this.activeTheme.decoration,
      layout:     this.activeTheme.layout,
    };
  }

  /**
   * Allow app modules to contribute their own token namespace to a theme.
   * e.g. themeEngine.extendTheme('default', 'icanspell', { traceOpacity: 0.4 })
   */
  extendTheme(themeId: string, namespace: string, tokens: Record<string, unknown>): void {
    const theme = this.registry.get(themeId);
    if (!theme) {
      console.warn(`[ThemeEngine] Cannot extend unknown theme "${themeId}"`);
      return;
    }
    theme.extensions ??= {};
    theme.extensions[namespace] = { ...theme.extensions[namespace], ...tokens };
  }

  getExtension<T extends Record<string, unknown>>(
    namespace: string,
    themeId?: string,
  ): T | null {
    const theme = themeId ? this.registry.get(themeId) : this.activeTheme;
    return (theme?.extensions?.[namespace] as T | undefined) ?? null;
  }
}

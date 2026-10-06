import { Layers, Plus, Search, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Button, ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SelectField } from '@/components/fields';
import { inputClasses } from '@/components/fieldStyles';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useCardCounts, useSets } from '@/data/hooks';
import { useSetsProgress } from '@/data/statsHooks';
import { languageName } from '@/domain/languages';
import { t, tn } from '@/i18n';
import { SetSummaryCard } from './SetSummaryCard';
import { collectFilterOptions, filterSets, type SetFilters } from './setFilters';

const PARAMS: Record<keyof SetFilters, string> = {
  query: 'q',
  language: 'langue',
  tag: 'etiquette',
};

export function SetListPage() {
  const sets = useSets();
  const counts = useCardCounts();
  const progress = useSetsProgress();
  // Les filtres vivent dans l'URL : ils sont conservés au retour depuis un set.
  const [params, setParams] = useSearchParams();
  const filters: SetFilters = {
    query: params.get(PARAMS.query) ?? '',
    language: params.get(PARAMS.language) ?? '',
    tag: params.get(PARAMS.tag) ?? '',
  };

  const setFilter = (key: keyof SetFilters, value: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(PARAMS[key], value);
        else next.delete(PARAMS[key]);
        return next;
      },
      { replace: true },
    );
  };

  const header = (
    <PageHeader
      title={t('sets.title')}
      actions={
        <>
          <ButtonLink variant="secondary" to="/import">
            <Upload aria-hidden="true" className="size-5" />
            {t('sets.import')}
          </ButtonLink>
          <ButtonLink to="/sets/new">
            <Plus aria-hidden="true" className="size-5" />
            {t('sets.newSet')}
          </ButtonLink>
        </>
      }
    />
  );

  if (!sets || !counts) {
    return (
      <>
        {header}
        <Loading />
      </>
    );
  }

  if (sets.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Layers}
          title={t('sets.emptyTitle')}
          body={t('sets.emptyBody')}
          action={<ButtonLink to="/sets/new">{t('sets.newSet')}</ButtonLink>}
        />
      </>
    );
  }

  const options = collectFilterOptions(sets);
  const visible = filterSets(sets, filters);
  const hasFilters = Boolean(filters.query || filters.language || filters.tag);

  return (
    <>
      {header}
      <div
        role="search"
        aria-label={t('sets.filters')}
        className="mb-6 grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr]"
      >
        <div>
          <label htmlFor="set-search" className="mb-1.5 block font-medium">
            {t('sets.searchLabel')}
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-fg-muted"
            />
            <input
              id="set-search"
              type="search"
              value={filters.query}
              placeholder={t('sets.searchPlaceholder')}
              onChange={(event) => {
                setFilter('query', event.target.value);
              }}
              className={`${inputClasses} pl-10`}
            />
          </div>
        </div>
        <SelectField
          label={t('sets.languageFilter')}
          value={filters.language}
          onChange={(event) => {
            setFilter('language', event.target.value);
          }}
        >
          <option value="">{t('sets.allLanguages')}</option>
          {options.languages
            .map((code) => ({ code, name: languageName(code) }))
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
            .map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
        </SelectField>
        <SelectField
          label={t('sets.tagFilter')}
          value={filters.tag}
          disabled={options.tags.length === 0}
          onChange={(event) => {
            setFilter('tag', event.target.value);
          }}
        >
          <option value="">{t('sets.allTags')}</option>
          {options.tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </SelectField>
      </div>

      <p className="sr-only" aria-live="polite">
        {tn('sets.resultCount', visible.length)}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('sets.noResultsTitle')}
          body={t('sets.noResultsBody')}
          action={
            hasFilters && (
              <Button
                variant="secondary"
                onClick={() => {
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                {t('sets.clearFilters')}
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((set) => (
            <li key={set.id}>
              <SetSummaryCard
                set={set}
                cardCount={counts.get(set.id) ?? 0}
                counts={progress?.get(set.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

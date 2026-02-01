/**
 * Unit tests for fuzzyMatch module.
 * Run with: npx ts-node fuzzyMatch.test.ts
 */

import assert from 'assert';
import {
    loadFileList,
    buildFileIndex,
    resolveFuzzy,
    type FuzzyStrategy,
} from './fuzzyMatch';

function run(): void {
    const fileListContent = [
        './CV-LAN/CVLAN1/DSC00800.jpg',
        './cv-lan/cvlan1/dsc00964.jpg',
        './dreamhack/dreamhack_97/martin_ojes/p000335.jpg',
        './internationella/hackers_at_large_2001/gea/trip_to_hal_2001.jpg',
    ].join('\n');

    const entries = loadFileList(fileListContent);
    assert.strictEqual(entries.length, 4);
    assert.strictEqual(entries[0].fullPath, 'CV-LAN/CVLAN1/DSC00800.jpg');
    assert.strictEqual(entries[0].dirPath, 'CV-LAN/CVLAN1');
    assert.strictEqual(entries[0].filename, 'DSC00800.jpg');
    assert.deepStrictEqual(entries[0].dirSegments, ['CV-LAN', 'CVLAN1']);

    const fileIndex = buildFileIndex(entries);
    assert.strictEqual(fileIndex.entries.length, 4);

    const consensusStrategy: FuzzyStrategy = {
        algorithm: 'Weighted fuzzy consensus (path+album+filename)',
        type: 'consensus',
        params: {
            threshold: 0.55,
            confidenceGap: 0.3,
            lowerThreshold: 0.45,
            weights: { pathWeight: 0.2, albumWeight: 0.4, fileWeight: 0.4 },
        },
    };

    const exactMatch = resolveFuzzy(
        { dirSegments: ['CV-LAN', 'CVLAN1'], baseFilename: 'DSC00800.jpg' },
        fileIndex,
        consensusStrategy,
    );
    assert.strictEqual(exactMatch, 'CV-LAN/CVLAN1/DSC00800.jpg');

    const caseInsensitiveMatch = resolveFuzzy(
        { dirSegments: ['cv-lan', 'cvlan1'], baseFilename: 'dsc00964.jpg' },
        fileIndex,
        consensusStrategy,
    );
    assert.ok(
        caseInsensitiveMatch === 'cv-lan/cvlan1/dsc00964.jpg' ||
            caseInsensitiveMatch === 'CV-LAN/CVLAN1/DSC00964.jpg',
    );

    const fuzzyMatch = resolveFuzzy(
        { dirSegments: ['dreamhack', 'dreamhack 97', 'martin_ojes'], baseFilename: 'p000335.jpg' },
        fileIndex,
        consensusStrategy,
    );
    assert.strictEqual(fuzzyMatch, 'dreamhack/dreamhack_97/martin_ojes/p000335.jpg');

    const noMatch = resolveFuzzy(
        { dirSegments: ['nonexistent'], baseFilename: 'missing.jpg' },
        fileIndex,
        consensusStrategy,
    );
    assert.strictEqual(noMatch, null);

    const emptyParsed = resolveFuzzy(
        { dirSegments: [], baseFilename: '' },
        fileIndex,
        consensusStrategy,
    );
    assert.strictEqual(emptyParsed, null);

    const emptyIndex = buildFileIndex(loadFileList(''));
    const matchOnEmpty = resolveFuzzy(
        { dirSegments: ['a'], baseFilename: 'b.jpg' },
        emptyIndex,
        consensusStrategy,
    );
    assert.strictEqual(matchOnEmpty, null);

    const singleStrategy: FuzzyStrategy = {
        algorithm: 'Exact normalized',
        type: 'single',
        params: null,
    };
    const singleExact = resolveFuzzy(
        { dirSegments: ['internationella', 'hackers_at_large_2001', 'gea'], baseFilename: 'trip_to_hal_2001.jpg' },
        fileIndex,
        singleStrategy,
    );
    assert.ok(singleExact !== null);

    console.log('fuzzyMatch tests passed');
}

run();

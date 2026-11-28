import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = './data';

export async function fetchList() {
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();
        return await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchPacks() {
    try {
        const packsResult = await fetch(`${dir}/_packs.json`);
        const packs = await packsResult.json();
        return packs;
    } catch {
        return [];
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();
    const packs = await fetchPacks();

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Verification
        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
            packs: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        // Records
        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
                packs: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    // Packs bonus calculation
    if (packs && packs.length > 0) {
        packs.forEach((pack) => {
            if (!pack.levels || pack.levels.length === 0) return;

            const playersPerLevel = pack.levels.map((levelPath) => {
                const found = list.find(([lvl]) => lvl && lvl.path === levelPath);
                const completers = new Set();
                if (found && found[0]) {
                    const lvl = found[0];
                    if (lvl.verifier) completers.add(lvl.verifier.toLowerCase());
                    (lvl.records || []).forEach((rec) => {
                        if (rec.percent === 100) {
                            completers.add(rec.user.toLowerCase());
                        }
                    });
                }
                return completers;
            });

            const firstSet = [...playersPerLevel[0]];
            const packWinners = firstSet.filter((playerLower) =>
                playersPerLevel.every((set) => set.has(playerLower)),
            );

            packWinners.forEach((winnerLower) => {
                const user = Object.keys(scoreMap).find(
                    (u) => u.toLowerCase() === winnerLower,
                );
                if (user && scoreMap[user]) {
                    scoreMap[user].packs.push({
                        name: pack.name,
                        score: pack.points || 0,
                    });
                }
            });
        });
    }

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed, packs: userPacks } = scores;
        const total = [verified, completed, progressed, userPacks]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}

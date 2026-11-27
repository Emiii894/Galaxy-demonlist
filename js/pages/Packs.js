import { fetchList } from '../content.js';
import { getYoutubeIdFromUrl } from '../util.js';
import Spinner from '../components/Spinner.js';
import LevelAuthors from '../components/List/LevelAuthors.js';

export default {
    components: {
        Spinner,
        LevelAuthors,
    },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <table class="list" v-if="packs.length > 0">
                    <tr v-for="(pack, i) in packs" :key="pack.name">
                        <td class="rank">
                            <p class="type-label-lg" :style="{ color: pack.colour || 'inherit' }">+{{ pack.points }}</p>
                        </td>
                        <td class="level" :class="{ 'active': selectedPack === i }">
                            <button @click="selectPack(i)">
                                <span class="type-label-lg" :style="{ color: pack.colour || 'inherit' }">{{ pack.name }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container" v-if="currentPack">
                <div class="level">
                    <h1 :style="{ color: currentPack.colour || 'inherit' }">{{ currentPack.name }}</h1>
                    <p class="type-label-lg" style="margin-top: -0.5rem; opacity: 0.8;">
                        Recompensa al completar todos los niveles: <strong>+{{ currentPack.points }} puntos</strong>
                    </p>

                    <div style="margin-top: 1.5rem;">
                        <h3>Niveles incluidos ({{ currentPack.levels.length }})</h3>
                        <table class="records" style="margin-top: 0.5rem;">
                            <tr v-for="level in currentPack.levels" :key="level.path">
                                <td class="percent">
                                    <p>#{{ level.rank }}</p>
                                </td>
                                <td class="user">
                                    <a :href="level.verification" target="_blank" class="type-label-lg">{{ level.name }}</a>
                                </td>
                                <td class="mobile">
                                    <p style="opacity: 0.7;">por {{ level.author }}</p>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-top: 2rem;">
                        <h3>Completado por ({{ currentPack.victors.length }})</h3>
                        <table class="records" v-if="currentPack.victors.length > 0" style="margin-top: 0.5rem;">
                            <tr v-for="user in currentPack.victors" :key="user">
                                <td class="percent">
                                    <p>+{{ currentPack.points }} pts</p>
                                </td>
                                <td class="user">
                                    <p class="type-label-lg">{{ user }}</p>
                                </td>
                            </tr>
                        </table>
                        <p v-else style="margin-top: 0.5rem; opacity: 0.7;">Nadie ha completado este pack todavía.</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        packs: [],
        loading: true,
        selectedPack: 0,
    }),
    computed: {
        currentPack() {
            return this.packs[this.selectedPack];
        },
    },
    methods: {
        selectPack(index) {
            this.selectedPack = index;
        },
    },
    async mounted() {
        const list = await fetchList();
        const packsRes = await fetch('./data/_packs.json');
        const rawPacks = await packsRes.json();

        this.packs = rawPacks.map((pack) => {
            const resolvedLevels = pack.levels
                .map((path) => {
                    const index = list.findIndex(([lvl]) => lvl && lvl.path === path);
                    if (index !== -1) {
                        return { ...list[index][0], rank: index + 1 };
                    }
                    return null;
                })
                .filter(Boolean);

            // Calcular automáticamente qué jugadores tienen 100% (o son verifiers) en TODOS los niveles del pack
            const playersPerLevel = resolvedLevels.map((lvl) => {
                const completers = new Set();
                if (lvl.verifier) completers.add(lvl.verifier.toLowerCase());
                (lvl.records || []).forEach((rec) => {
                    if (rec.percent === 100) completers.add(rec.user.toLowerCase());
                });
                return completers;
            });

            // Obtener nombres originales con mayúsculas/minúsculas correctas
            const nameMap = {};
            resolvedLevels.forEach((lvl) => {
                if (lvl.verifier) nameMap[lvl.verifier.toLowerCase()] = lvl.verifier;
                (lvl.records || []).forEach((rec) => {
                    if (rec.percent === 100) nameMap[rec.user.toLowerCase()] = rec.user;
                });
            });

            let victors = [];
            if (playersPerLevel.length > 0) {
                const firstSet = [...playersPerLevel[0]];
                victors = firstSet
                    .filter((player) => playersPerLevel.every((set) => set.has(player)))
                    .map((lowerName) => nameMap[lowerName]);
            }

            return {
                ...pack,
                levels: resolvedLevels,
                victors,
            };
        });

        this.loading = false;
    },
};

import { fetchList } from '../content.js';
import { getThumbnailFromId, getYoutubeIdFromUrl } from '../util.js';
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
                    <template v-for="(pack, i) in packs" :key="pack.name">
                        <tr>
                            <td colspan="2" style="padding: 1rem 0.5rem;">
                                <h2 :style="{ color: pack.colour || 'inherit' }">{{ pack.name }}</h2>
                            </td>
                        </tr>
                        <tr v-for="(level, j) in pack.levels" :key="level.path">
                            <td class="rank">
                                <p class="type-label-lg">#{{ level.rank }}</p>
                            </td>
                            <td class="level" :class="{ 'active': selectedPack === i && selectedLevel === j }">
                                <button @click="selectLevel(i, j)">
                                    <span class="type-label-lg">{{ level.name }}</span>
                                </button>
                            </td>
                        </tr>
                    </template>
                </table>
            </div>
            <div class="level-container" v-if="currentLevel">
                <div class="level">
                    <h1>{{ currentLevel.name }}</h1>
                    <LevelAuthors :author="currentLevel.author" :creators="currentLevel.creators" :verifier="currentLevel.verifier"></LevelAuthors>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ currentLevel.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ currentLevel.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        packs: [],
        loading: true,
        selectedPack: 0,
        selectedLevel: 0,
    }),
    computed: {
        currentLevel() {
            return this.packs[this.selectedPack]?.levels[this.selectedLevel];
        },
        video() {
            if (!this.currentLevel) return '';
            return `https://www.youtube.com/embed/${getYoutubeIdFromUrl(this.currentLevel.verification)}`;
        },
    },
    methods: {
        selectLevel(packIndex, levelIndex) {
            this.selectedPack = packIndex;
            this.selectedLevel = levelIndex;
        },
    },
    async mounted() {
        const list = await fetchList();
        const packsRes = await fetch('./data/_packs.json');
        const rawPacks = await packsRes.json();

        this.packs = rawPacks.map((pack) => {
            const resolvedLevels = pack.levels
                .map((path) => {
                    const index = list.findIndex(([lvl, err]) => lvl && lvl.path === path);
                    if (index !== -1) {
                        return { ...list[index][0], rank: index + 1 };
                    }
                    return null;
                })
                .filter(Boolean);

            return {
                ...pack,
                levels: resolvedLevels,
            };
        });

        this.loading = false;
    },
};

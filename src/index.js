/* eslint-disable no-debugger */
export default class DynamicVirtualScroll {
    constructor(options) {
        this.observer = null;
        this.opsCheck(options);
    }

    opsCheck(ops) {
        if (!ops || typeof ops !== 'object') {
            throw new Error('options are illegal');
        }

        const {
            firstItemId,
            lastItemId,
            itemHeight,
            container,
            listSize,
            dataLen,
            renderFunction,
            refetchFunction,
        } = ops;

        if (!firstItemId) {
            throw new Error('firstItemId can not be null');
        }

        if (!lastItemId) {
            throw new Error('lastItemId can not be null');
        }

        if (!itemHeight || typeof itemHeight !== 'number') {
            throw new Error('itemHeight is illegal');
        }

        if (!renderFunction || typeof renderFunction !== 'function') {
            throw new Error('lastItemId is illegal');
        }
        if (!refetchFunction || typeof refetchFunction !== 'function') {
            throw new Error('lastItemId is illegal');
        }

        if (!listSize) {
            throw new Error('listSize is illegal');
        }

        if (!dataLen) {
            throw new Error('dataLen is illegal');
        }

        if (!container || !container.nodeType) {
            throw new Error('root is illegal');
        }

        this.itemHeight = itemHeight; // 每个节点的行高
        this.firstItemId = firstItemId; // 第一个
        this.lastItemId = lastItemId; // 最后一个
        this.container = container; // 容器node
        this.listSize = listSize; // 共渲染的个数
        this.dataLen = dataLen;
        this.renderFunction = renderFunction; // 更新函数
        this.refetchFunction = refetchFunction;

        this.firstItem = document.getElementById(firstItemId);
        this.lastItem = document.getElementById(lastItemId);

        this.domDataCache = {
            currentPaddingTop: 0,
            currentPaddingBottom: 0,
            topSentinelPreviousY: 0,
            topSentinelPreviousRatio: 0,
            bottomSentinelPreviousY: 0,
            bottomSentinelPreviousRatio: 0,
            currentIndex: 0,
            isLoading: false,
        };
    }

    updateDomDataCache(params) {
        Object.assign(this.domDataCache, params);
    }

    async wrapRefetch() {
        await this.refetchFunction();
        this.domDataCache.isLoading = false;
    }

    adjustPaddings(isScrollDown) {
        const { container, itemHeight } = this;
        const { currentPaddingTop, currentPaddingBottom, isLoading } = this.domDataCache;

        let newCurrentPaddingTop, newCurrentPaddingBottom;

        const remPaddingsVal = itemHeight * (Math.floor(this.listSize / 2));

        if (isScrollDown) {
            newCurrentPaddingTop = currentPaddingTop + remPaddingsVal;
            if (currentPaddingBottom === 0) {
                newCurrentPaddingBottom = 0;
            } else {
                newCurrentPaddingBottom = currentPaddingBottom - remPaddingsVal;
            }
        } else {
            if (!isLoading) {
                newCurrentPaddingBottom = currentPaddingBottom + remPaddingsVal;
            } else {
                newCurrentPaddingBottom = currentPaddingBottom
            }

            if (currentPaddingTop === 0) {
                newCurrentPaddingTop = 0;
            } else {
                newCurrentPaddingTop = currentPaddingTop - remPaddingsVal;
            }
        }

        container.style.paddingBottom = `${newCurrentPaddingBottom}px`;
        container.style.paddingTop = `${newCurrentPaddingTop}px`;

        this.updateDomDataCache({
            currentPaddingTop: newCurrentPaddingTop,
            currentPaddingBottom: newCurrentPaddingBottom
        });
    }

    getWindowFirstIndex = (isScrollDown) => {
        const {
            currentIndex
        } = this.domDataCache;

        // 以全部容器内所有元素的一半作为增量
        const increment = Math.floor(this.listSize / 2);

        let firstIndex;

        if (isScrollDown) {
            firstIndex = currentIndex + increment;
        } else {
            firstIndex = currentIndex - increment;
        }

        if (firstIndex < 0) {
            firstIndex = 0;
        }

        return firstIndex;
    }

    topItemCb(entry) {
        const {
            topSentinelPreviousY,
            topSentinelPreviousRatio
        } = this.domDataCache;

        const currentY = entry.boundingClientRect.top;
        const currentRatio = entry.intersectionRatio;
        const isIntersecting = entry.isIntersecting;

        if (
            currentY > topSentinelPreviousY
            && isIntersecting
            && currentRatio >= topSentinelPreviousRatio
        ) {
            console.log('topSentCallback.. go');
            const firstIndex = this.getWindowFirstIndex(false);
            this.renderFunction(firstIndex);
            this.adjustPaddings(false);

            this.updateDomDataCache({
                currentIndex: firstIndex,
                topSentinelPreviousY: currentY,
                topSentinelPreviousRatio: currentRatio
            });
        } else {
            this.updateDomDataCache({
                topSentinelPreviousY: currentY,
                topSentinelPreviousRatio: currentRatio
            });
        }
    }

    bottomItemCb(entry) {
        const {
            bottomSentinelPreviousY,
            bottomSentinelPreviousRatio,
            isLoading,
        } = this.domDataCache;

        const currentY = entry.boundingClientRect.top;
        const currentRatio = entry.intersectionRatio;
        const isIntersecting = entry.isIntersecting;

        if (
           ( currentY < bottomSentinelPreviousY
            && currentRatio >= bottomSentinelPreviousRatio
            && isIntersecting)
        ) {
            console.log('botSentCallback.. go');
            const firstIndex = this.getWindowFirstIndex(true);

            // 确保item-last节点不会消亡 || 到达loading
            if (firstIndex + this.listSize > this.dataLen) {
                this.updateDomDataCache({
                    isLoading: true,
                });
                this.wrapRefetch();
                setTimeout(() => {
                    if (!isLoading) {
                        this.bottomItemCb(entry);
                    }
                    console.log('组件内部', this.dataLen);
                }, 0);

                return;
            }

            this.renderFunction(firstIndex);

            this.adjustPaddings(true);

            this.updateDomDataCache({
                currentIndex: firstIndex,
                bottomSentinelPreviousY: currentY,
                bottomSentinelPreviousRatio: currentRatio
            });
        } else {
            this.updateDomDataCache({
                bottomSentinelPreviousY: currentY,
                bottomSentinelPreviousRatio: currentRatio
            });
        }
    }


    initIntersectionObserver() {
        const options = {};

        const callback = (entries) => {
            entries.forEach((entry) => {
                if (entry.target.id === this.firstItemId) {
                    console.log('start');
                    this.topItemCb(entry);
                } else if (entry.target.id === this.lastItemId) {
                    console.log('end');
                    this.bottomItemCb(entry);
                }
            });
        };

        this.observer = new IntersectionObserver(callback, options);

        this.observer.observe(this.firstItem);
        this.observer.observe(this.lastItem);
    }

    // 开始监测
    startObserver() {
        this.initIntersectionObserver();
    }

    // 停止监测
    stopObserver() {
        this.observer.unobserve(this.firstItem);
        this.observer.unobserve(this.lastItem);
    }
}

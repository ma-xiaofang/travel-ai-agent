declare module 'mp-html/dist/uni-app/components/mp-html/mp-html' {
    import { DefineComponent } from 'vue'
    const component: DefineComponent<{
        content: string
        containerStyle?: string
        copyLink?: boolean
        domain?: string
        errorImg?: string
        lazyLoad?: boolean
        loadingImg?: string
        pauseVideo?: boolean
        previewImg?: boolean
        scrollTable?: boolean
        selectable?: boolean | string
        setTitle?: boolean
        showImgMenu?: boolean
        tagStyle?: Record<string, string>
        useAnchor?: boolean | number
    }, {}, {}>
    export default component
}

import { globalVariables } from "./global";
import { htmlToElement } from "./utils/html-to-element";
import { tryCatch } from "./utils/try-catch";

(async function main() {
    document.head.appendChild(htmlToElement<HTMLStyleElement>(`
        <style>
            .bluesky-large-thumbnails__debug-info {
                position: absolute;
                bottom: calc( 1rem + 30px );
                right: 2rem;
                background-color: rgba(0, 0, 0, 0.5);
                border-radius: 0.5rem;
                color: white;
                padding: 0.5rem;
            }
        </style>
    `));

    if (globalVariables.isInDebugMode) {
        globalVariables.debugPanel = htmlToElement<HTMLPreElement>(`
            <pre class="bluesky-large-thumbnails__debug-info" style="position: fixed;"></pre>
        `, document.body);
    }

    const observer = globalVariables.mutationObserverManager.new(async (mutations) => {
        if (
            window.location.href === 'https://x.com/compose/tweet'
            || window.location.href.includes('https://x.com/messages')
        )
            return;

        for (const mutation of mutations) {
            processMutation(mutation)
                .catch((err) => {
                    console.error(err);
                })
        }
    }, 'main');

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
})();

async function processMutation(mutation: MutationRecord) {
    if (!mutation.addedNodes) {
        return;
    }

    // Get element that resemble as a post
    const element = mutation.addedNodes[0] as Node | undefined;

    // Check if the node added is a Element or not
    if (!(element instanceof HTMLElement)) {
        return;
    }

    // Check if the node added is a Post
    if (element.matches(':has(> :first-child > div[data-testid^="feedItem-by"])')) {
        processPostMutation(element);
    }
    // Check if the node added is a Page
    else if (element.matches('.r-13awgt0.r-zchlnj[style*="display"]')) {
        processPageMutation(element);
    }
}

async function processPostMutation(post: HTMLElement) {
    const waitUntilImageExists = async () =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            // Image selector
            const selector = 'img[src*="/feed_thumbnail/"]';

            // If the image is already fully loaded, return it
            const image = post.querySelector<HTMLImageElement>(selector);
            if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
                return resolve(image);
            }

            // Define observer
            const observer = globalVariables.mutationObserverManager.new(mutations => CallbackFn(post, mutations), 'post image', {post});
            observer.observe(post, {
                childList: true,
                subtree: true,
            });

            // Define Timeout
            const timeoutID = setTimeout(() => {
                globalVariables.mutationObserverManager.destroy(observer);
                reject(new Error('Timeout'));
            }, 1000)

            // Define observer callback function
            async function CallbackFn(post: HTMLElement, mutations: MutationRecord[]) {
                // Try to get post's image
                const image = post.querySelector<HTMLImageElement>(selector)
                if (!image) {
                    return;
                }

                // Ensure the image's content is fully loaded by checking its naturalWidth and naturalHeight
                const [err] = await tryCatch(() => new Promise<boolean>((resolve) => {
                    var time = 0
                    const intervalID = setInterval(() => {
                        // If exceed execute limit, throw error
                        if (time++ > 100) {
                            clearInterval(intervalID);
                            reject(new Error('Exceed execute limit'));
                        }

                        // If the image's content is fully loaded, return it
                        if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                            clearInterval(intervalID);
                            resolve(true)
                        }
                    }, 100);
                }));

                if (err) {
                    console.error('[Bluesky Large Thumbnails]', 'This image not loading!', image, err);
                }

                // Clean up and return image
                clearTimeout(timeoutID);
                globalVariables.mutationObserverManager.destroy(observer);
                resolve(image);
            }
        });

    const [err, image] = await tryCatch(waitUntilImageExists)
    if (err) {
        // This post contains no image
        if (globalVariables.isInDebugMode) {
            injectDebugInfo(post, {
                'reject reason': 'This post contains no image.'
            });
            post.style.backgroundColor = 'rgb(13, 3, 49)';
        }
        return;
    }

    const singleImageContainer = post.querySelector<HTMLDivElement>('[style*="padding-top"]:has([src*="/feed_thumbnail/"])')
    const imageAspectRatioDefiner = singleImageContainer?.querySelector<HTMLDivElement>('[style*="aspect-ratio"]');
    if (!singleImageContainer || image.naturalWidth > image.naturalHeight) {
        // This post is either not a single image only post
        // or the image is in landscape size

        if (globalVariables.isInDebugMode) {
            if (!singleImageContainer) {
                injectDebugInfo(post, {
                    'reject reason': 'This post contains more than one image.'
                });
            }
            else if (image.naturalWidth > image.naturalHeight) {
                injectDebugInfo(post, {
                    'reject reason': 'The image is in landscape.'
                });
            }
            post.style.backgroundColor = 'rgb(13, 3, 49)';
        }
        return;
    }

    // Calculate the image's natural size aspect ratio
    const containerWidth = singleImageContainer.getBoundingClientRect().width;
    const intrinsicRatio = image.naturalHeight / image.naturalWidth;

    // Expand the image container's height and set the image's aspect ratio to match the image,
    // so the image can show its full content
    singleImageContainer.style.paddingTop = `${intrinsicRatio * 100}%`;
    if (imageAspectRatioDefiner) {
        imageAspectRatioDefiner.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`
    }

    const debugInfo = {}

    // If the image was too small before expanding, switch its compressed content to its uncompressed content
    if (intrinsicRatio > 1000 / 513) {
        image.src = image.src.replace(/\/feed_thumbnail\//, '/feed_fullsize/')

        if (globalVariables.isInDebugMode) {
            image.style.outline = '0.5rem rgba(255, 100, 100, 0.5) solid'
            image.style.outlineOffset = '-0.5rem'
        }
    }

    if (globalVariables.isInDebugMode) {
        injectDebugInfo(post, {
            'image width': image.naturalWidth,
            'image height': image.naturalHeight,
            'image source src': image.src.match('^https?:\/\/cdn\.bsky\.app\/img\/(.+?)\/.*$')?.[1] ?? 'unknown'
        });
        post.style.backgroundColor = 'rgb(44, 54, 66)';
    }
}

async function processPageMutation(page: HTMLElement) {
    // If the page's content was already loaded before, the post will be stored and won't trigger the addedNodes mutation.
    // So here we query all the posts that was already loaded and process them.
    const posts = [...page.querySelectorAll<HTMLElement>(':has(> :first-child > div[data-testid^="feedItem-by"])')];

    for (const post of posts) {
        processPostMutation(post);
    }
}

function injectDebugInfo(post: HTMLElement, debugObj: Record<string, string | number>) {
    const opPost = post.querySelector<HTMLElement>(':first-child')!;
    opPost.style.position = 'relative';
    const debugInfo = post.querySelector<HTMLElement>(':first-child .bluesky-large-thumbnails__debug-info')
        ?? htmlToElement<HTMLElement>(`
            <pre class="bluesky-large-thumbnails__debug-info"></pre>
        `, opPost);

    debugInfo.innerHTML = Object.entries(debugObj)
        .map(([key, value]) => `${key}: ${value.toString().trim()}`)
        .join('\n&ZeroWidthSpace;')
}

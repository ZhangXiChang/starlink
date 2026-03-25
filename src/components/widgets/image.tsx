import { createMemo, type JSX, onCleanup, splitProps } from "solid-js";

export default function Image(
	props: {
		image?: Uint8Array | Array<number> | File | string | null;
	} & JSX.ImgHTMLAttributes<HTMLImageElement>,
) {
	const [split_props, rest_props] = splitProps(props, ["image", "src"]);
	const image_url = createMemo(() => {
		if (
			split_props.image instanceof Uint8Array ||
			split_props.image instanceof Array
		) {
			const url = URL.createObjectURL(
				new Blob([Uint8Array.from(split_props.image)]),
			);
			onCleanup(() => URL.revokeObjectURL(url));
			return url;
		} else if (split_props.image instanceof File) {
			const url = URL.createObjectURL(split_props.image);
			onCleanup(() => URL.revokeObjectURL(url));
			return url;
		} else if (typeof split_props.image === "string") {
			return split_props.image;
		}
	});
	return <img {...rest_props} src={image_url()} />;
}

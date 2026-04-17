import Image from "next/image";

type Props = {
  imageUrl: string;
  name: string;
  revealed: boolean;
};

export function SilhouetteCard({ imageUrl, name, revealed }: Props) {
  return (
    <div className="silhouette-card">
      <Image
        src={imageUrl}
        alt={revealed ? name : "Pokemon silhouette"}
        width={280}
        height={280}
        className={revealed ? "pokemon-image revealed" : "pokemon-image silhouette"}
      />
    </div>
  );
}

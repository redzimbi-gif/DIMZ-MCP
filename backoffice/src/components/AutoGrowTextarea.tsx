"use client";

import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

/**
 * Zone de texte multiligne qui grandit avec son contenu, sans jamais rétrécir
 * sous `rows`. Pensée pour les champs où l'on ne sait pas d'avance combien de
 * texte sera saisi — la description d'une ligne de devis, par exemple : parfois
 * « Convoyage Lyon → Paris », parfois le détail d'une prestation sur dix
 * lignes.
 *
 * Pourquoi pas un simple `<textarea rows={6}>` : une grande boîte toujours
 * ouverte pour chacune des huit lignes d'un devis donne un formulaire de trois
 * écrans de haut, illisible. La boîte part donc à deux lignes et suit la
 * frappe.
 *
 * La hauteur est aussi recalculée au montage, pour qu'une description déjà
 * enregistrée s'affiche en entier à l'ouverture de la fiche plutôt que coupée
 * avec un ascenseur.
 */
export function AutoGrowTextarea({
  rows = 2,
  maxRows = 14,
  className,
  onInput,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { maxRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function ajuster(el: HTMLTextAreaElement) {
    const styles = window.getComputedStyle(el);
    const ligne = parseFloat(styles.lineHeight) || 20;
    const chrome =
      parseFloat(styles.paddingTop) +
      parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) +
      parseFloat(styles.borderBottomWidth);
    const min = ligne * rows + chrome;
    const max = ligne * maxRows + chrome;

    // Remettre à la hauteur minimale avant de lire scrollHeight : sinon la
    // boîte ne redescend jamais quand on supprime du texte.
    el.style.height = `${min}px`;
    const voulue = el.scrollHeight + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    el.style.height = `${Math.min(Math.max(voulue, min), max)}px`;
    // Au-delà de maxRows, l'ascenseur reprend la main plutôt que de pousser le
    // reste du formulaire hors de l'écran.
    el.style.overflowY = voulue > max ? "auto" : "hidden";
  }

  useEffect(() => {
    if (ref.current) ajuster(ref.current);
    // Une description préremplie peut changer après un enregistrement : la
    // valeur par défaut fait donc partie des dépendances.
  }, [props.defaultValue, props.value, rows, maxRows]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={rows}
      className={className}
      onInput={(event) => {
        ajuster(event.currentTarget);
        onInput?.(event);
      }}
    />
  );
}

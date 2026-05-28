import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createCheckIn } from "#/lib/entries";
import f from "./LogAnythingModal.module.css";
import { emojiFor, type SliderMetric } from "./LogSliderModal";
import s from "./LogSliderModal.module.css";

type PhysicalKind = "water" | "exercise" | "daylight";
type SelfCareKind =
	| "showered"
	| "brushed_teeth"
	| "dressed"
	| "medication"
	| "screen_free"
	| "recovery";
type MealKind = "ate_breakfast" | "ate_lunch" | "ate_dinner";
type SubstanceKind = "caffeine" | "alcohol" | "nicotine" | "drugs";

const SLIDERS: { metric: SliderMetric; label: string }[] = [
	{ metric: "mood", label: "Humör" },
	{ metric: "energy", label: "Energi" },
	{ metric: "sleep", label: "Sömn" },
	{ metric: "anxiety", label: "Ångest" },
	{ metric: "stress", label: "Stress" },
	{ metric: "concentration", label: "Koncentration" },
];

const PHYSICAL: { kind: PhysicalKind; label: string; unit: string }[] = [
	{ kind: "water", label: "Vatten", unit: "glas" },
	{ kind: "exercise", label: "Träning", unit: "min" },
	{ kind: "daylight", label: "Dagsljus", unit: "min" },
];

const SELFCARE: { kind: SelfCareKind; label: string }[] = [
	{ kind: "showered", label: "Duschat" },
	{ kind: "brushed_teeth", label: "Borstat tänderna" },
	{ kind: "dressed", label: "Klätt på mig" },
	{ kind: "medication", label: "Tagit min medicin" },
	{ kind: "screen_free", label: "Skärmfri stund" },
	{ kind: "recovery", label: "Tid för återhämtning" },
];

const MEALS: { kind: MealKind; label: string }[] = [
	{ kind: "ate_breakfast", label: "Frukost" },
	{ kind: "ate_lunch", label: "Lunch" },
	{ kind: "ate_dinner", label: "Middag" },
];

const SUBSTANCES: { kind: SubstanceKind; label: string }[] = [
	{ kind: "caffeine", label: "Koffein" },
	{ kind: "alcohol", label: "Alkohol" },
	{ kind: "nicotine", label: "Nikotin" },
	{ kind: "drugs", label: "Droger" },
];

const emptyNumbers = () => ({ water: "", exercise: "", daylight: "" });
const emptySelfCare = () => ({
	showered: false,
	brushed_teeth: false,
	dressed: false,
	medication: false,
	screen_free: false,
	recovery: false,
});

const emptyMeals = () => ({
	ate_breakfast: false,
	ate_lunch: false,
	ate_dinner: false,
});
const emptySubstances = () => ({
	caffeine: 0,
	alcohol: 0,
	nicotine: 0,
	drugs: 0,
});

export function LogAnythingModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const router = useRouter();
	const [values, setValues] = useState<Record<SliderMetric, number>>({
		mood: 5,
		energy: 5,
		sleep: 5,
		anxiety: 5,
		stress: 5,
		concentration: 5,
	});
	const [touched, setTouched] = useState<Record<SliderMetric, boolean>>({
		mood: false,
		energy: false,
		sleep: false,
		anxiety: false,
		stress: false,
		concentration: false,
	});
	const [sleepHours, setSleepHours] = useState(8);
	const [sleepHoursTouched, setSleepHoursTouched] = useState(false);
	const [numbers, setNumbers] = useState(emptyNumbers());
	const [selfCare, setSelfCare] = useState(emptySelfCare());
	const [meals, setMeals] = useState(emptyMeals());
	const [socialNote, setSocialNote] = useState("");
	const [substances, setSubstances] = useState(emptySubstances());
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setValues({
			mood: 5,
			energy: 5,
			sleep: 5,
			anxiety: 5,
			stress: 5,
			concentration: 5,
		});
		setTouched({
			mood: false,
			energy: false,
			sleep: false,
			anxiety: false,
			stress: false,
			concentration: false,
		});
		setSleepHours(8);
		setSleepHoursTouched(false);
		setNumbers(emptyNumbers());
		setSelfCare(emptySelfCare());
		setMeals(emptyMeals());
		setSocialNote("");
		setSubstances(emptySubstances());
		setNote("");
		setSaving(false);
		setError(null);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	const clampHours = (n: number) =>
		Math.max(0, Math.min(24, Math.round(n * 2) / 2));
	const numOf = (v: string) => {
		const n = Number(v);
		return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
	};

	const hasAnything =
		Object.values(touched).some(Boolean) ||
		sleepHoursTouched ||
		numOf(numbers.water) > 0 ||
		numOf(numbers.exercise) > 0 ||
		numOf(numbers.daylight) > 0 ||
		Object.values(selfCare).some(Boolean) ||
		Object.values(meals).some(Boolean) ||
		socialNote.trim().length > 0 ||
		Object.values(substances).some((n) => n > 0) ||
		note.trim().length > 0;

	async function handleSave() {
		if (!hasAnything || saving) return;
		setSaving(true);
		setError(null);
		try {
			await createCheckIn({
				data: {
					mood: touched.mood ? values.mood : undefined,
					energy: touched.energy ? values.energy : undefined,
					anxiety: touched.anxiety ? values.anxiety : undefined,
					stress: touched.stress ? values.stress : undefined,
					concentration: touched.concentration
						? values.concentration
						: undefined,
					sleepQuality: touched.sleep ? values.sleep : undefined,
					sleepHours:
						touched.sleep || sleepHoursTouched ? sleepHours : undefined,
					water: numOf(numbers.water) || undefined,
					exercise: numOf(numbers.exercise) || undefined,
					daylight: numOf(numbers.daylight) || undefined,
					showered: selfCare.showered || undefined,
					brushedTeeth: selfCare.brushed_teeth || undefined,
					dressed: selfCare.dressed || undefined,
					medication: selfCare.medication || undefined,
					screenFree: selfCare.screen_free || undefined,
					recovery: selfCare.recovery || undefined,
					ateBreakfast: meals.ate_breakfast || undefined,
					ateLunch: meals.ate_lunch || undefined,
					ateDinner: meals.ate_dinner || undefined,
					socialNote: socialNote.trim() || undefined,
					caffeine: substances.caffeine || undefined,
					alcohol: substances.alcohol || undefined,
					nicotine: substances.nicotine || undefined,
					drugs: substances.drugs || undefined,
					note: note.trim() || undefined,
				},
			});
			await router.invalidate();
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Något gick fel. Försök igen.");
			setSaving(false);
		}
	}

	return (
		<div className={s.backdrop} onClick={onClose} role="presentation">
			<div
				className={`${s.modal} ${f.formModal}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="checkin-title"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 id="checkin-title" className={s.title}>
					Ny incheckning
				</h2>
				<p className={f.subtitle}>
					Fyll i det du har lust med — allt är frivilligt.
				</p>

				<div className={f.scroll}>
					<section className={f.group}>
						<span className={f.groupLabel}>Mående</span>
						{SLIDERS.map(({ metric, label }) => (
							<EmojiSlider
								key={metric}
								metric={metric}
								label={label}
								value={values[metric]}
								active={touched[metric]}
								onChange={(v) => {
									setValues((m) => ({ ...m, [metric]: v }));
									setTouched((m) => ({ ...m, [metric]: true }));
								}}
								trailing={
									metric === "sleep" ? (
										<div className={f.hoursControl}>
											<button
												type="button"
												className={f.hoursBtn}
												aria-label="Minska timmar"
												disabled={sleepHours <= 0}
												onClick={() => {
													setSleepHours((h) => clampHours(h - 0.5));
													setSleepHoursTouched(true);
												}}
											>
												−
											</button>
											<input
												type="number"
												className={f.hoursInput}
												min={0}
												max={24}
												step={0.5}
												value={sleepHours}
												onChange={(e) => {
													const n = Number(e.target.value);
													if (Number.isFinite(n)) {
														setSleepHours(clampHours(n));
														setSleepHoursTouched(true);
													}
												}}
												aria-label="Antal timmar sömn"
											/>
											<span className={f.hoursUnit}>h</span>
											<button
												type="button"
												className={f.hoursBtn}
												aria-label="Öka timmar"
												disabled={sleepHours >= 24}
												onClick={() => {
													setSleepHours((h) => clampHours(h + 0.5));
													setSleepHoursTouched(true);
												}}
											>
												+
											</button>
										</div>
									) : null
								}
							/>
						))}
					</section>

					<section className={f.group}>
						<span className={f.groupLabel}>Fysiskt</span>
						<div className={f.row}>
							{PHYSICAL.map(({ kind, label, unit }) => (
								<label key={kind} className={f.numField}>
									<span className={f.numLabel}>{label}</span>
									<span className={f.numInputWrap}>
										<input
											className={f.numInput}
											inputMode="numeric"
											placeholder="0"
											value={numbers[kind]}
											onChange={(e) =>
												setNumbers((n) => ({
													...n,
													[kind]: e.target.value.replace(/[^0-9]/g, ""),
												}))
											}
										/>
										<span className={f.numUnit}>{unit}</span>
									</span>
								</label>
							))}
						</div>
						<div className={f.row}>
							{MEALS.map(({ kind, label }) => (
								<label key={kind} className={f.check}>
									<input
										type="checkbox"
										checked={meals[kind]}
										onChange={(e) =>
											setMeals((c) => ({ ...c, [kind]: e.target.checked }))
										}
									/>
									<span>{label}</span>
								</label>
							))}
						</div>
					</section>

					<section className={f.group}>
						<span className={f.groupLabel}>Egenvård</span>
						<div className={f.row}>
							{SELFCARE.map(({ kind, label }) => (
								<label key={kind} className={f.check}>
									<input
										type="checkbox"
										checked={selfCare[kind]}
										onChange={(e) =>
											setSelfCare((c) => ({ ...c, [kind]: e.target.checked }))
										}
									/>
									<span>{label}</span>
								</label>
							))}
						</div>
					</section>

					<section className={f.group}>
						<span className={f.groupLabel}>Socialt</span>
						<input
							className={f.textInput}
							placeholder="Vem träffade eller pratade du med?"
							value={socialNote}
							onChange={(e) => setSocialNote(e.target.value)}
							maxLength={280}
							aria-label="Sociala interaktioner"
						/>
					</section>

					<section className={f.group}>
						<span className={f.groupLabel}>Substanser</span>
						<div className={f.row}>
							{SUBSTANCES.map(({ kind, label }) => {
								const count = substances[kind];
								return (
									<button
										key={kind}
										type="button"
										className={
											count > 0 ? `${f.addBtn} ${f.addBtnOn}` : f.addBtn
										}
										onClick={() =>
											setSubstances((sub) => ({
												...sub,
												[kind]: sub[kind] + 1,
											}))
										}
										onContextMenu={(e) => {
											e.preventDefault();
											setSubstances((sub) => ({
												...sub,
												[kind]: Math.max(0, sub[kind] - 1),
											}));
										}}
									>
										<span className={f.addPlus} aria-hidden="true">
											+
										</span>
										{label}
										{count > 0 ? (
											<span className={f.addCount}>{count}</span>
										) : null}
									</button>
								);
							})}
						</div>
					</section>

					<section className={f.group}>
						<span className={f.groupLabel}>Anteckningar</span>
						<textarea
							className={f.textarea}
							placeholder="Något du vill lägga till?"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={3}
							maxLength={280}
						/>
					</section>
				</div>

				{error ? <p className={s.error}>{error}</p> : null}

				<div className={s.actions}>
					<button
						type="button"
						className={`${s.btn} ${s.btnGhost}`}
						onClick={onClose}
						disabled={saving}
					>
						Avbryt
					</button>
					<button
						type="button"
						className={`${s.btn} ${s.btnPrimary}`}
						onClick={handleSave}
						disabled={saving || !hasAnything}
					>
						{saving ? "Sparar…" : "Spara incheckning"}
					</button>
				</div>
			</div>
		</div>
	);
}

function EmojiSlider({
	metric,
	label,
	value,
	active,
	onChange,
	trailing,
}: {
	metric: SliderMetric;
	label: string;
	value: number;
	active: boolean;
	onChange: (v: number) => void;
	trailing?: React.ReactNode;
}) {
	const emojiSrc = emojiFor(metric, value);
	const fillPct = (value / 10) * 100;
	return (
		<div className={active ? `${f.slider} ${f.sliderOn}` : f.slider}>
			<div className={f.sliderHead}>
				<span className={f.sliderLabel}>{label}</span>
				<span className={f.sliderValue}>
					{active ? value.toFixed(1).replace(".", ",") : "—"}
				</span>
			</div>
			<div className={f.sliderBody}>
				{emojiSrc ? (
					<img src={emojiSrc} alt="" className={f.emoji} draggable={false} />
				) : (
					<span className={f.emoji} />
				)}
				<div className={f.sliderWrap}>
					<div
						className={f.track}
						style={{ ["--fill" as string]: `${fillPct}%` }}
						aria-hidden="true"
					/>
					<input
						type="range"
						min={0}
						max={10}
						step={0.1}
						value={value}
						onChange={(e) => onChange(Number(e.target.value))}
						className={f.range}
						aria-label={label}
					/>
				</div>
			</div>
			{trailing}
		</div>
	);
}

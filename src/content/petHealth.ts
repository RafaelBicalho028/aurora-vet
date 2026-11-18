/**
 * Cuidados preventivos dos pets (carteira de saúde) e escolhas incorretas usadas na consulta preventiva.
 * Intervalos são exemplos didáticos; o protocolo real é definido pelo médico-veterinário.
 * No jogo, o tempo do pet é acelerado: 1 dia real = 1 mês do pet.
 */
import type { PetKind } from './pets';

export interface CareItem {
  id: string;
  name: string;
  kinds: PetKind[];
  /** 0 = feito uma única vez */
  intervalMonths: number;
  why: string;
  refs: string[];
}

export interface CareDistractor {
  id: string;
  text: string;
  kinds: PetKind[];
  category: 'incorrect' | 'critical';
  why: string;
  refs: string[];
}

const ALL: PetKind[] = ['dog', 'cat', 'rabbit', 'guineapig', 'hamster', 'cockatiel'];
const DC: PetKind[] = ['dog', 'cat'];
const SMALL: PetKind[] = ['rabbit', 'guineapig', 'hamster'];

export const CARE_ITEMS: CareItem[] = [
  { id: 'consulta', name: 'Consulta preventiva com exame físico completo', kinds: ALL, intervalMonths: 12, why: 'Consultas periódicas permitem detectar doenças antes dos sinais aparecerem e ajustar os cuidados à idade do animal.', refs: ['day2016', 'quesenberry2012', 'harrison2006'] },
  { id: 'vacinas_cao', name: 'Vacinas essenciais (cinomose, parvovirose, adenovírus) e antirrábica, conforme protocolo', kinds: ['dog'], intervalMonths: 12, why: 'Vacinas essenciais são recomendadas para todos os cães, mesmo os que saem pouco de casa; a antirrábica é obrigatória onde exigida por lei.', refs: ['day2016'] },
  { id: 'vacinas_gato', name: 'Vacinas essenciais (panleucopenia, herpesvírus, calicivírus) e antirrábica, conforme protocolo', kinds: ['cat'], intervalMonths: 12, why: 'Vacinas essenciais são recomendadas para todos os gatos, inclusive os de vida domiciliar.', refs: ['day2016'] },
  { id: 'endoparasitas', name: 'Controle de vermes (vermifugação ou exame de fezes)', kinds: DC, intervalMonths: 3, why: 'Quando o risco individual não é conhecido, diretrizes recomendam controle pelo menos 4 vezes ao ano. Alguns vermes são zoonóticos.', refs: ['esccap2021', 'taylor2016'] },
  { id: 'ectoparasitas', name: 'Controle de pulgas e carrapatos com produto registrado para a espécie', kinds: DC, intervalMonths: 1, why: 'A regularidade evita reinfestações; a frequência depende do produto escolhido pelo veterinário.', refs: ['rust1997'] },
  { id: 'castracao', name: 'Avaliar castração com o veterinário', kinds: ['dog', 'cat', 'rabbit'], intervalMonths: 0, why: 'A castração previne ninhadas indesejadas e algumas doenças; o melhor momento é discutido com o veterinário.', refs: ['day2016', 'quesenberry2012'] },
  { id: 'identificacao', name: 'Identificação (plaquinha com contato e/ou microchip)', kinds: DC, intervalMonths: 0, why: 'Animais identificados têm muito mais chance de voltar para casa se fugirem.', refs: ['day2016'] },
  { id: 'dentes_dc', name: 'Avaliação e higiene dental', kinds: DC, intervalMonths: 12, why: 'A doença periodontal é muito comum em cães e gatos, especialmente nos de porte pequeno.', refs: ['nelson2019'] },
  { id: 'dentes_roedor', name: 'Avaliação dos dentes de crescimento contínuo', kinds: SMALL, intervalMonths: 6, why: 'Em coelhos e roedores, desgaste inadequado dos dentes causa dor, recusa alimentar e emagrecimento.', refs: ['quesenberry2012'] },
  { id: 'dieta_feno', name: 'Revisar a dieta: feno à vontade como base', kinds: ['rabbit', 'guineapig'], intervalMonths: 12, why: 'O feno garante fibra para o trato digestivo e desgaste dos dentes.', refs: ['quesenberry2012'] },
  { id: 'vitamina_c', name: 'Garantir fonte diária de vitamina C', kinds: ['guineapig'], intervalMonths: 12, why: 'O porquinho-da-índia não sintetiza vitamina C; a deficiência causa escorbuto.', refs: ['quesenberry2012'] },
  { id: 'ambiente_hamster', name: 'Revisar o ambiente: gaiola individual espaçosa e substrato para cavar', kinds: ['hamster'], intervalMonths: 12, why: 'O hamster-sírio é solitário e precisa de espaço e enriquecimento.', refs: ['quesenberry2012'] },
  { id: 'dieta_ave', name: 'Revisar a dieta: ração extrusada/peletizada e vegetais', kinds: ['cockatiel'], intervalMonths: 12, why: 'Dietas só de sementes causam deficiências e obesidade.', refs: ['harrison2006'] },
  { id: 'bico_unhas', name: 'Avaliação de bico, unhas e penas', kinds: ['cockatiel'], intervalMonths: 6, why: 'Alterações de bico, unhas e penas podem indicar problemas nutricionais ou doenças.', refs: ['harrison2006'] },
];

export const CARE_DISTRACTORS: CareDistractor[] = [
  { id: 'x_permetrina', text: 'Aplicar no gato um antipulgas de cão à base de permetrina', kinds: ['cat'], category: 'critical', why: 'Permetrina concentrada é tóxica para gatos e pode causar tremores e convulsões.', refs: ['boland2010'] },
  { id: 'x_remedio_humano', text: 'Dar remédio humano (paracetamol, ibuprofeno) por conta própria se parecer com dor', kinds: DC, category: 'critical', why: 'Paracetamol é extremamente tóxico para gatos, e anti-inflamatórios humanos podem causar úlceras e lesão renal em cães e gatos.', refs: ['merck'] },
  { id: 'x_vermes_so_visiveis', text: 'Vermifugar só quando aparecerem vermes nas fezes', kinds: DC, category: 'incorrect', why: 'A maioria das infecções não mostra vermes visíveis; o controle é preventivo e periódico.', refs: ['esccap2021'] },
  { id: 'x_pular_vacina', text: 'Pular as vacinas porque o animal não sai de casa', kinds: DC, category: 'incorrect', why: 'Agentes podem chegar pelo ambiente, por roupas e calçados; vacinas essenciais valem para todos.', refs: ['day2016'] },
  { id: 'x_calor', text: 'Passear com o cão no horário mais quente do dia', kinds: ['dog'], category: 'incorrect', why: 'Calor intenso causa hipertermia e queimaduras nos coxins; braquicefálicos são ainda mais vulneráveis.', refs: ['merck'] },
  { id: 'x_areia', text: 'Limpar a caixa de areia só uma vez por semana', kinds: ['cat'], category: 'incorrect', why: 'Caixa suja causa estresse e pode levar o gato a urinar fora dela; a limpeza deve ser diária.', refs: ['merck'] },
  { id: 'x_banho_roedor', text: 'Dar banho semanal com água e xampu', kinds: SMALL, category: 'incorrect', why: 'Banhos não são recomendados de rotina para coelhos e pequenos roedores: causam estresse e risco de hipotermia.', refs: ['quesenberry2012'] },
  { id: 'x_racao_frutas', text: 'Dieta baseada em ração e frutas, com pouco feno', kinds: ['rabbit', 'guineapig'], category: 'incorrect', why: 'Pouca fibra favorece problemas dentários e gastrintestinais.', refs: ['quesenberry2012'] },
  { id: 'x_vitc_racao_velha', text: 'Contar apenas com a ração aberta há meses como fonte de vitamina C', kinds: ['guineapig'], category: 'incorrect', why: 'A vitamina C se degrada com o tempo de armazenamento; fontes frescas diárias são necessárias.', refs: ['quesenberry2012'] },
  { id: 'x_dois_hamsters', text: 'Colocar dois hamsters-sírios adultos na mesma gaiola para fazer companhia', kinds: ['hamster'], category: 'incorrect', why: 'Hamsters-sírios adultos são solitários e brigam, com risco de ferimentos graves.', refs: ['quesenberry2012'] },
  { id: 'x_sementes', text: 'Alimentar apenas com mistura de sementes', kinds: ['cockatiel'], category: 'incorrect', why: 'Sementes são ricas em gordura e pobres em vitaminas e minerais.', refs: ['harrison2006'] },
  { id: 'x_antiaderente', text: 'Deixar o viveiro na cozinha, perto de panelas antiaderentes aquecidas', kinds: ['cockatiel'], category: 'critical', why: 'Vapores de revestimentos antiaderentes superaquecidos podem matar aves em minutos.', refs: ['harrison2006'] },
];

/** No jogo, 1 dia real equivale a 1 mês do pet. */
export const PET_MONTH_MS = 24 * 60 * 60 * 1000;

<?php

namespace App\Http\Controllers;

use App\Models\CruiseLeg;
use App\Models\User;
use App\Models\Vessel;
use Illuminate\Http\Request;
use Illuminate\Validation\Validator;

/**
 * CRUD das etapas do plano de cruzeiro (tela de detalhes da embarcação).
 * A leitura vem junto da página (VesselController::show); aqui só escrita.
 */
class CruiseLegController extends Controller
{
    /** Quem monta o plano de cruzeiro: a gestão (mesma trava de inativar OS). */
    public const EDITORES = ['dev', 'coordinator', 'engineer'];

    public static function podeEditar(?User $user): bool
    {
        return in_array($user?->role->name ?? null, self::EDITORES, true);
    }

    public function store(Request $request, Vessel $vessel)
    {
        $this->autorizar($request);
        $dados = $this->validar($request, $vessel);

        $etapa = $vessel->cruiseLegs()->create([
            ...$dados,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return back()->with('success', "{$this->nome($etapa)} cadastrada.");
    }

    public function update(Request $request, CruiseLeg $cruiseLeg)
    {
        $this->autorizar($request);
        $dados = $this->validar($request, $cruiseLeg->vessel, $cruiseLeg);

        $cruiseLeg->update([...$dados, 'updated_by' => $request->user()->id]);

        return back()->with('success', "{$this->nome($cruiseLeg)} atualizada.");
    }

    public function destroy(Request $request, CruiseLeg $cruiseLeg)
    {
        $this->autorizar($request);
        $nome = $this->nome($cruiseLeg);
        $cruiseLeg->delete();

        return back()->with('success', "{$nome} excluída.");
    }

    private function autorizar(Request $request): void
    {
        if (! self::podeEditar($request->user())) {
            abort(403, 'Só dev, coordenador ou engenheiro editam o plano de cruzeiro.');
        }
    }

    private function nome(CruiseLeg $etapa): string
    {
        return sprintf('Etapa %02d', $etapa->leg_number);
    }

    /**
     * Além do formato, duas regras de negócio:
     *  - a embarcação não está em dois cruzeiros ao mesmo tempo: etapas não
     *    se sobrepõem (encostar é permitido -- desembarca e embarca no mesmo dia);
     *  - o nº da etapa não se repete no mesmo ano.
     */
    private function validar(Request $request, Vessel $vessel, ?CruiseLeg $atual = null): array
    {
        $dados = $request->validate([
            'leg_number' => 'required|integer|min:1|max:999',
            'area' => 'required|string|max:255',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after_or_equal:starts_at',
            'embark_port' => 'required|string|max:255',
            'disembark_port' => 'required|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ], [
            'ends_at.after_or_equal' => 'O fim não pode ser antes do início.',
        ]);

        foreach (['area', 'embark_port', 'disembark_port', 'notes'] as $campo) {
            $dados[$campo] = isset($dados[$campo]) ? (trim($dados[$campo]) ?: null) : null;
        }

        validator($dados)->after(function (Validator $v) use ($dados, $vessel, $atual) {
            $outras = CruiseLeg::where('vessel_id', $vessel->id)
                ->when($atual, fn ($q) => $q->whereKeyNot($atual->id));

            $sobreposta = (clone $outras)
                ->whereDate('starts_at', '<', $dados['ends_at'])
                ->whereDate('ends_at', '>', $dados['starts_at'])
                ->orderBy('starts_at')
                ->first();
            if ($sobreposta) {
                $v->errors()->add('starts_at', sprintf(
                    'Sobrepõe a Etapa %02d (%s a %s).',
                    $sobreposta->leg_number,
                    $sobreposta->starts_at->format('d/m/Y'),
                    $sobreposta->ends_at->format('d/m/Y'),
                ));
            }

            $ano = substr($dados['starts_at'], 0, 4);
            $repetida = (clone $outras)
                ->where('leg_number', $dados['leg_number'])
                ->whereYear('starts_at', $ano)
                ->exists();
            if ($repetida) {
                $v->errors()->add('leg_number', sprintf('Já existe uma Etapa %02d em %s.', $dados['leg_number'], $ano));
            }
        })->validate();

        return $dados;
    }
}

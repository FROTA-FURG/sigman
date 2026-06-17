<?php

namespace App\Services;

use App\Models\Vessel;

class VesselService
{
    public function getAllVessels()
    {
        // Aqui você pode adicionar paginação no futuro, ex: paginate(10)
        return Vessel::all();
    }

    public function getVesselById($id)
    {
        return Vessel::findOrFail($id);
    }

    public function createVessel(array $data)
    {
        return Vessel::create($data);
    }

    public function updateVessel($id, array $data)
    {
        $vessel = Vessel::findOrFail($id);
        $vessel->update($data);
        return $vessel;
    }

    public function deleteVessel($id)
    {
        $vessel = $this->getVesselById($id);
        return $vessel->delete();
    }
}
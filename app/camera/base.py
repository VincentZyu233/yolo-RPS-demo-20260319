from abc import ABC, abstractmethod
import numpy as np


class CameraBase(ABC):
    @abstractmethod
    def read(self) -> np.ndarray:
        pass

    @abstractmethod
    def release(self):
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass
